package cafe.kirameki.minikuraVelocity

import com.mojang.brigadier.Command
import com.mojang.brigadier.arguments.StringArgumentType
import com.mojang.brigadier.context.CommandContext
import com.mojang.brigadier.suggestion.SuggestionsBuilder
import com.velocitypowered.api.command.BrigadierCommand
import com.velocitypowered.api.command.CommandSource
import com.velocitypowered.api.proxy.ConnectionRequestBuilder
import com.velocitypowered.api.proxy.Player
import com.velocitypowered.api.proxy.ProxyServer
import com.velocitypowered.api.proxy.ServerConnection
import com.velocitypowered.api.proxy.server.RegisteredServer
import net.kyori.adventure.text.Component
import net.kyori.adventure.text.format.NamedTextColor
import java.util.function.Consumer

object ServerCommand {
    fun createServerCommand(proxy: ProxyServer): BrigadierCommand {
        val serverNode = BrigadierCommand.literalArgumentBuilder("server")
            .then(BrigadierCommand.requiredArgumentBuilder("serverName", StringArgumentType.word())
                .suggests { context: CommandContext<CommandSource?>?, builder: SuggestionsBuilder ->
                    proxy.allServers.forEach(Consumer { server: RegisteredServer ->
                        builder.suggest(
                            server.serverInfo.name
                        )
                    })
                    builder.buildFuture()
                }
                .executes { context: CommandContext<CommandSource> ->
                    val source = context.source

                    if (source !is Player) {
                        source.sendMessage(
                            Component.text(
                                "Only players can use this command.",
                                NamedTextColor.RED
                            )
                        )
                        return@executes Command.SINGLE_SUCCESS
                    }

                    val serverName = context.getArgument("serverName", String::class.java)

                    proxy.getServer(serverName).ifPresentOrElse(
                        { server: RegisteredServer? ->
                            source.createConnectionRequest(server).connect()
                                .thenAccept { result: ConnectionRequestBuilder.Result ->
                                    if (result.isSuccessful) {
                                        source.sendMessage(
                                            Component.text(
                                                "Connected to $serverName", NamedTextColor.GREEN
                                            )
                                        )
                                    } else {
                                        source.sendMessage(
                                            Component.text(
                                                "Failed to connect to $serverName", NamedTextColor.RED
                                            )
                                        )
                                    }
                                }
                        },
                        {
                            source.sendMessage(
                                Component.text(
                                    "Server '$serverName' not found.", NamedTextColor.RED
                                )
                            )
                        }
                    )

                    return@executes Command.SINGLE_SUCCESS
                }
            )
            .executes { context: CommandContext<CommandSource> ->
                val source = context.source

                if (source !is Player) {
                    source.sendMessage(
                        Component.text(
                            "Only players can use this command.",
                            NamedTextColor.RED
                        )
                    )
                    return@executes Command.SINGLE_SUCCESS
                }

                source.currentServer.ifPresentOrElse(
                    { currentServer: ServerConnection ->
                        source.sendMessage(
                            Component.text(
                                "You are currently connected to: " + currentServer.serverInfo.name,
                                NamedTextColor.GREEN
                            )
                        )
                    },
                    {
                        source.sendMessage(
                            Component.text(
                                "You are not connected to any server.", NamedTextColor.RED
                            )
                        )
                    }
                )

                return@executes Command.SINGLE_SUCCESS
            }
            .build()

        return BrigadierCommand(serverNode)
    }
}
