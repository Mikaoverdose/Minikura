package cafe.kirameki.minikuraVelocity

import com.velocitypowered.api.proxy.ProxyServer
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import org.slf4j.Logger
import java.net.URI
import java.time.Duration
import com.google.gson.JsonParser

class MinikuraWebSocketClient(private val plugin: Main, private val logger: Logger, private val server: ProxyServer, serverUri: URI?) : WebSocketClient(serverUri) {
    
    override fun onOpen(handshakedata: ServerHandshake) {
        logger.info("Connected to WebSocket server at: ${uri}")
    }

    override fun onMessage(message: String) {
        logger.debug("Received: $message")
        
        try {
            val jsonElement = JsonParser.parseString(message)
            if (jsonElement.isJsonObject) {
                val jsonObject = jsonElement.asJsonObject
                
                val type = jsonObject.get("type")?.asString
                val endpoint = jsonObject.get("endpoint")?.asString
                val timestamp = jsonObject.get("timestamp")?.asString
                
                when (type) {
                    "test" -> {
                        logger.info("API Call detected: endpoint=$endpoint, timestamp=$timestamp")
                        
                        logger.info("API endpoint $endpoint was accessed")
                    }
                    "SERVER_CHANGE" -> {
                        val action = jsonObject.get("action")?.asString
                        val serverType = jsonObject.get("serverType")?.asString
                        val serverId = jsonObject.get("serverId")?.asString
                        
                        logger.info("Server change detected: action=$action, serverType=$serverType, serverId=$serverId")
                        
                        when (action?.uppercase()) {
                            "CREATE" -> {
                                logger.info("Server '$serverId' was created")
                                executeRefreshCommand()
                            }
                            "UPDATE" -> {
                                logger.info("Server '$serverId' was updated")
                                executeRefreshCommand()
                            }
                            "DELETE" -> {
                                logger.info("Server '$serverId' was deleted")
                                executeRefreshCommand()
                            }
                            else -> {
                                logger.info("$action")
                            }
                        }
                    }
                    else -> {
                        logger.info("Received WebSocket message of type: $type")
                    }
                }
            } else {
                logger.info("Received non-JSON WebSocket message: $message")
            }
        } catch (e: Exception) {
            logger.warn("Failed to parse WebSocket message: $message", e)
        }
    }

    override fun onError(ex: Exception) {
        when (ex) {
            is java.net.ConnectException -> {
                logger.warn("Failed to connect to WebSocket server at: ${uri}")
            }
            else -> {
                logger.error("WebSocket error occurred", ex)
            }
        }
    }

    override fun onClose(code: Int, reason: String, remote: Boolean) {
        logger.info("WebSocket connection closed (code: $code, reason: $reason)")
    }
    
    private fun executeRefreshCommand() {
        try {
            server.scheduler.buildTask(plugin, Runnable {
                try {
                    logger.info("Executing automatic server refresh...")
                    plugin.refreshServers()
                    plugin.getallServer()
                    logger.info("Server refresh completed successfully")
                } catch (e: Exception) {
                    logger.error("Failed to refresh servers", e)
                }
            }).schedule()
        } catch (e: Exception) {
            logger.error("Failed to schedule refresh command", e)
        }
    }
}