package cafe.kirameki.minikuraVelocity.utils

import cafe.kirameki.minikuraVelocity.Main
import cafe.kirameki.minikuraVelocity.models.ReverseProxyServerData
import cafe.kirameki.minikuraVelocity.store.ServerDataStore
import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import com.imaginarycode.minecraft.redisbungee.RedisBungeeAPI
import com.velocitypowered.api.proxy.ProxyServer
import com.velocitypowered.api.scheduler.ScheduledTask
import com.velocitypowered.api.scheduler.TaskStatus
import net.kyori.adventure.key.Key
import net.kyori.adventure.text.Component
import org.slf4j.Logger
import java.net.InetSocketAddress
import java.util.*
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.function.Consumer

object ProxyTransferUtils {
    private val redisBungeeApi = RedisBungeeAPI.getRedisBungeeApi()
    private var jwtSecret = System.getenv("MINIKURA_JWT_SECRET") ?: "secret"
    private val jwtAlgorithm = Algorithm.HMAC256(jwtSecret)
    lateinit var server: ProxyServer
    lateinit var plugin: Main
    lateinit var logger: Logger
    lateinit var acceptingTransfers: AtomicBoolean

    fun migratePlayersToServer(targetServer: ReverseProxyServerData, disconnectFailed : Boolean = false): ScheduledTask {
        val targetAddress = InetSocketAddress(targetServer.external_address, targetServer.external_port)
        val currentProxyName = redisBungeeApi.proxyId

        val playerOnThisProxy = redisBungeeApi.getPlayersOnProxy(currentProxyName)
            .map { it.toString() }

        val players = server.allPlayers
            .toList()
            .filter { playerOnThisProxy.contains(it.uniqueId.toString()) }

        val batchSize = (players.size * 0.05).coerceAtLeast(1.0).toInt()

        var currentIndex = 0

        for (player in players) {
            player.sendMessage(Component.text("Proxy transfer in progress..."))
        }

        val taskId = server.scheduler.buildTask(plugin, Consumer { scheduledTask ->
            if (currentIndex >= players.size) {
                scheduledTask.cancel()
                return@Consumer
            }

            val batch = players.subList(currentIndex, (currentIndex + batchSize).coerceAtMost(players.size))
            currentIndex += batchSize

            batch.forEach { player ->
                val currentServer = player.currentServer.orElse(null)
                try {
                    if (currentServer == null || !player.isActive) return@forEach

                    val token = JWT.create()
                        .withIssuer("minikura")
                        .withClaim("uuid", player.uniqueId.toString())
                        .withClaim("server", currentServer.serverInfo.name)
                        .withClaim("origin", currentProxyName)
                        .withExpiresAt(Date(System.currentTimeMillis() + 60 * 5 * 1000))
                        .sign(jwtAlgorithm)

                    player.storeCookie(Key.key("minikura", "transfer_packet"), token.toByteArray())
                    player.transferToHost(targetAddress)

                } catch (e: IllegalArgumentException) {
                    logger.error("Player ${player.username} client does not support transfers")
                    if (disconnectFailed) {
                        player.disconnect(Component.text("Failed to migrate you to the target server. Please reconnect."))
                    }
                } catch (e: Exception) {
                    logger.error("Error migrating player ${player.username} to server ${targetServer.id}: ${e.message}", e)
                    if (disconnectFailed) {
                        player.disconnect(Component.text("Failed to migrate you to the target server. Please reconnect."))
                    }
                }
            }
        })
            .delay(3, TimeUnit.SECONDS)
            .repeat(3, TimeUnit.SECONDS)
            .schedule()

        return taskId
    }

    fun endProxy() {
        acceptingTransfers.set(false)
        logger.info("Proxy is being shut down. No new connections or transfers will be accepted.")

        val allProxies = redisBungeeApi.allProxies
            .filter { it != redisBungeeApi.proxyId }

        if (allProxies.isEmpty()) {
            for (player in server.allPlayers) {
                player.disconnect(Component.text("The proxy is being shut down. No other proxies are available."))
            }
            return
        }

        val nextProxy = allProxies.first()
        val targetServer = ServerDataStore.getReverseProxyServer(nextProxy)
        if (targetServer != null) {
            val task = migratePlayersToServer(targetServer, true)

            server.scheduler.buildTask(plugin, Runnable {
                if (task.status() != TaskStatus.FINISHED && task.status() != TaskStatus.CANCELLED) {
                    return@Runnable
                }

                for (player in server.allPlayers) {
                    player.disconnect(Component.text("The proxy is being shut down. Please reconnect."))
                }

                server.shutdown()
            }).repeat(5, TimeUnit.SECONDS).schedule()
        }
    }
}
