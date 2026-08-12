package cafe.kirameki.minikuraVelocity

import cafe.kirameki.minikuraVelocity.listeners.ProxyTransferHandler
import cafe.kirameki.minikuraVelocity.models.ReverseProxyServerData
import cafe.kirameki.minikuraVelocity.models.ServerData
import cafe.kirameki.minikuraVelocity.store.ServerDataStore
import cafe.kirameki.minikuraVelocity.utils.ProxyTransferUtils
import cafe.kirameki.minikuraVelocity.utils.createWebSocketClient
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.google.inject.Inject
import com.imaginarycode.minecraft.redisbungee.RedisBungeeAPI
import com.velocitypowered.api.command.CommandManager
import com.velocitypowered.api.command.CommandMeta
import com.velocitypowered.api.command.SimpleCommand
import com.velocitypowered.api.event.Subscribe
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent
import com.velocitypowered.api.plugin.Dependency
import com.velocitypowered.api.plugin.Plugin
import com.velocitypowered.api.proxy.ProxyServer
import com.velocitypowered.api.proxy.server.RegisteredServer
import com.velocitypowered.api.proxy.server.ServerInfo
import net.kyori.adventure.text.Component
import okhttp3.OkHttpClient
import okhttp3.Request
import org.slf4j.Logger
import java.net.InetSocketAddress
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean


@Plugin(
    id = "minikura-velocity",
    name = "MinikuraVelocity",
    version = "1.0",
    dependencies = [
        Dependency(id = "redisbungee")
    ]
)
class Main @Inject constructor(private val logger: Logger, private val server: ProxyServer) {
    private val servers: MutableMap<String, RegisteredServer> = HashMap()
    private val client = OkHttpClient()
    private val apiKey: String = System.getenv("MINIKURA_API_KEY") ?: ""
    private val apiUrl: String = System.getenv("MINIKURA_API_URL") ?: "http://localhost:3000/api"
    private val websocketUrl: String = System.getenv("MINIKURA_WEBSOCKET_URL") ?: "ws://localhost:3000/api/servers/ws?apiKey=$apiKey"
    private var acceptingTransfers = AtomicBoolean(false)
    private val redisBungeeApi = RedisBungeeAPI.getRedisBungeeApi()

    @Subscribe
    fun onProxyInitialization(event: ProxyInitializeEvent?) {
        logger.info("Minikura-Velocity is initializing...")

        ProxyTransferUtils.server = server
        ProxyTransferUtils.plugin = this
        ProxyTransferUtils.logger = logger
        ProxyTransferUtils.acceptingTransfers = acceptingTransfers

        val client = createWebSocketClient(this, logger, server, websocketUrl)
        client.connect()

        val commandManager: CommandManager = server.commandManager

        val refreshCommandMeta: CommandMeta = commandManager.metaBuilder("refresh")
            .plugin(this)
            .build()

        val refreshCommand = SimpleCommand { p ->
            val source = p.source()
            source.sendMessage(Component.text("Refreshing server list..."))

            Executors.newSingleThreadExecutor().submit {
                fetchServers()
                fetchReverseProxyServers()
                source.sendMessage(Component.text("Server list refreshed successfully!"))
            }
        }

        val serversCommandMeta: CommandMeta = commandManager.metaBuilder("server")
            .plugin(this)
            .build()

        val endCommandMeta: CommandMeta = commandManager.metaBuilder("end")
            .plugin(this)
            .build()

        val migrateCommandMeta: CommandMeta = commandManager.metaBuilder("migrate")
            .plugin(this)
            .build()

        val getallServerCommandMeta: CommandMeta = commandManager.metaBuilder("getallserver")
            .plugin(this)
            .build()

        val migrateCommand = SimpleCommand { p ->
            val source = p.source()
            val args = p.arguments()

            if (args.isEmpty()) {
                source.sendMessage(Component.text("Please specify a server to migrate players to."))
                return@SimpleCommand
            }

            val targetServerName = args[0]
            val targetServer = ServerDataStore.getReverseProxyServer(targetServerName)

            if (targetServer == null) {
                source.sendMessage(Component.text("Server '$targetServerName' not found."))
                return@SimpleCommand
            }

            if (targetServer.name == redisBungeeApi.proxyId) {
                source.sendMessage(Component.text("Target server cannot be the current proxy server."))
                return@SimpleCommand
            }

            ProxyTransferUtils.migratePlayersToServer(targetServer)
            source.sendMessage(Component.text("Migrating players to server '$targetServerName'..."))
        }

        val getallServerCommand = SimpleCommand { p ->
            getallServer()
        }

        commandManager.register(serversCommandMeta, ServerCommand.createServerCommand(server))
        commandManager.register(endCommandMeta, EndCommand.createEndCommand(server))
        commandManager.register(refreshCommandMeta, refreshCommand)
        commandManager.register(migrateCommandMeta, migrateCommand)
        commandManager.register(getallServerCommandMeta, getallServerCommand)

        val connectionHandler = ProxyTransferHandler(servers, logger, acceptingTransfers)
        server.eventManager.register(this, connectionHandler)

        Executors.newSingleThreadExecutor().submit {
            fetchServers()
            fetchReverseProxyServers()
            acceptingTransfers.set(true)
            logger.info("Ready to accept player new connections/proxy transfers.")
        }

        logger.info("Minikura-Velocity has been initialized.")
    }

    fun refreshServers() {
        fetchServers()
        fetchReverseProxyServers()
    }

    fun getallServer() {
        synchronized(ServerDataStore) {
            ServerDataStore.getServers().forEach { serverData ->
                logger.info("Server ID: ${serverData.id}, Type: ${serverData.type}, Description: ${serverData.description}")
            }
            ServerDataStore.getReverseProxyServers().forEach { reverseProxyServerData ->
                logger.info("Reverse Proxy Server ID: ${reverseProxyServerData.id}, External Address: ${reverseProxyServerData.external_address}, External Port: ${reverseProxyServerData.external_port}")
            }
        }
    }

    private fun fetchReverseProxyServers() {
        val request = Request.Builder()
            .url("$apiUrl/plugin/reverse-proxy")
            .header("Authorization", "Bearer $apiKey")
            .build()

        try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val fetchedServers = parseReverseProxyServersData(responseBody)

                server.scheduler.buildTask(this, Runnable {
                    synchronized(ServerDataStore) {
                        ServerDataStore.clearReverseProxyServers()
                        ServerDataStore.addAllReverseProxyServers(fetchedServers)
                    }
                }).schedule()
            } else {
                logger.error("Failed to fetch reverse proxy servers: ${response.message}")
            }
        } catch (e: Exception) {
            logger.error("Error fetching reverse proxy servers: ${e.message}", e)
        }
    }

    private fun fetchServers() {
        server.allServers.forEach { server.unregisterServer(it.serverInfo) }
        val request = Request.Builder()
            .url("$apiUrl/plugin/servers")
            .header("Authorization", "Bearer $apiKey")
            .build()

        try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string()
                val fetchedServers = parseServersData(responseBody)

                server.scheduler.buildTask(this, Runnable {
                    synchronized(ServerDataStore) {
                        ServerDataStore.clearServers()
                        ServerDataStore.addAllServers(fetchedServers)
                    }
                    populateServers(fetchedServers)
                }).schedule()
            } else {
                logger.error("Failed to fetch servers: ${response.message}")
            }
        } catch (e: Exception) {
            logger.error("Error fetching servers: ${e.message}", e)
        }
    }

    private fun parseReverseProxyServersData(responseBody: String?): List<ReverseProxyServerData> {
        if (responseBody.isNullOrEmpty()) return emptyList()

        val gson = Gson()
        val reverseProxyServerListType = object : TypeToken<List<ReverseProxyServerData>>() {}.type
        return gson.fromJson(responseBody, reverseProxyServerListType)
    }

    private fun parseServersData(responseBody: String?): List<ServerData> {
        if (responseBody.isNullOrEmpty()) return emptyList()

        val gson = Gson()

        val serverListType = object : TypeToken<List<ServerData>>() {}.type
        return gson.fromJson(responseBody, serverListType)
    }

    private fun populateServers(serversData: List<ServerData>) {
        servers.clear()

        for (data in serversData) {
            val serverInfo = ServerInfo(data.id, InetSocketAddress("localhost", data.listen_port))
            val registeredServer = server.createRawRegisteredServer(serverInfo)
            servers[data.id] = registeredServer
            this.server.registerServer(registeredServer.serverInfo)
        }
    }

}
