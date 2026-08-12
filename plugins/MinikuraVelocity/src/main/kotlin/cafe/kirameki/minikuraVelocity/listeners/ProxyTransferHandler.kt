package cafe.kirameki.minikuraVelocity.listeners

import cafe.kirameki.minikuraVelocity.store.ServerDataStore
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.imaginarycode.minecraft.redisbungee.RedisBungeeAPI
import com.velocitypowered.api.event.Subscribe
import com.velocitypowered.api.event.connection.PreLoginEvent
import com.velocitypowered.api.event.player.CookieReceiveEvent
import com.velocitypowered.api.event.player.PlayerChooseInitialServerEvent
import com.velocitypowered.api.proxy.server.RegisteredServer
import net.kyori.adventure.key.Key
import net.kyori.adventure.text.Component
import org.slf4j.Logger
import java.util.*
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicBoolean

class ProxyTransferHandler(
    private val servers: Map<String, RegisteredServer>,
    private val logger: Logger,
    private val acceptingTransfer: AtomicBoolean
) {
    private val cookieFutures = mutableMapOf<String, CompletableFuture<String>>()
    private var jwtSecret = System.getenv("MINIKURA_JWT_SECRET") ?: "secret"
    private val jwtAlgorithm = Algorithm.HMAC256(jwtSecret)
    private val jwtVerifier = JWT.require(jwtAlgorithm).withIssuer("minikura").build()
    private val redisBungeeApi = RedisBungeeAPI.getRedisBungeeApi()

    @Subscribe
    fun onPreLogin(event: PreLoginEvent) {
        if (!acceptingTransfer.get()) {
            event.result = PreLoginEvent.PreLoginComponentResult.denied(Component.text("Proxy are currently not accepting new connections."))
        }
    }

    @Subscribe
    fun onCookieReceiveEvent(event: CookieReceiveEvent) {
        if (event.originalKey == null || event.originalKey.toString() != "minikura:transfer_packet") {
            event.result = CookieReceiveEvent.ForwardResult.handled()
            return
        }

        val future = cookieFutures[event.player.uniqueId.toString()]
        if (event.originalData == null) {
            future?.complete(null)
            event.result = CookieReceiveEvent.ForwardResult.handled()
            return
        }

        try {
            val stringData = String(event.originalData as ByteArray)
            val decodedJwt = jwtVerifier.verify(stringData)
            val server = decodedJwt.claims["server"]?.asString()
            val uuid = decodedJwt.claims["uuid"]?.asString()
            val origin = decodedJwt.claims["origin"]?.asString()

            if (decodedJwt.expiresAt.before(Date())) {
                future?.complete(null)
                logger.warn("Received expired proxy transfer request for ${event.player.username}")
                event.result = CookieReceiveEvent.ForwardResult.handled()
                return
            }

            if (uuid != event.player.uniqueId.toString()) {
                future?.complete(null)
                logger.warn("Received mismatched UUID proxy transfer request for ${event.player.username} (expected ${event.player.uniqueId}, got $uuid)")
                event.result = CookieReceiveEvent.ForwardResult.handled()
                return
            }

            if (server == null) {
                future?.complete(null)
                logger.warn("Received invalid proxy transfer request for ${event.player.username}")
                event.result = CookieReceiveEvent.ForwardResult.handled()
                return
            }

            if (origin != null && !redisBungeeApi.allProxies.contains(origin)) {
                future?.complete(null)
                logger.warn("Received invalid origin proxy transfer request for ${event.player.username}")
                event.result = CookieReceiveEvent.ForwardResult.handled()
                return
            }

            future?.complete(server)
            logger.info("Accepted proxy transfer request $origin -> ${redisBungeeApi.proxyId} for ${event.player.username} -> $server")
            event.result = CookieReceiveEvent.ForwardResult.handled()
        } catch (e: Exception) {
            future?.complete(null)
            logger.error("Error verifying proxy transfer request for ${event.player.username}: ${e.message}")
        }
    }

    @Subscribe
    fun onPlayerChooseInitialServer(event: PlayerChooseInitialServerEvent) {
        val player = event.player
        val currentServer = event.initialServer;

        player.requestCookie(Key.key("minikura:transfer_packet"))

        val future = CompletableFuture<String>()
        cookieFutures[player.uniqueId.toString()] = future

        try {
            val serverName = future.get(3, TimeUnit.SECONDS)

            if (serverName != null && servers.containsKey(serverName)) {
                val targetServer = servers[serverName]
                if (targetServer != null) {
                    event.setInitialServer(targetServer)
                    return
                }
            }
        } catch (e: TimeoutException) {
            logger.warn("Timeout checking for proxy transfer request for ${player.username}")
        } finally {
            cookieFutures.remove(player.uniqueId.toString())
        }

        val sortedServers = ServerDataStore.getServers()
            .mapNotNull { servers[it.id] }

        for (server in sortedServers) {
            if (server != currentServer) {
                logger.info("Sending ${player.username} -> ${server.serverInfo.name}")
                event.setInitialServer(server)
                return
            }
        }

        logger.warn("No available servers with valid join_priority for ${player.username}")
    }
}
