package cafe.kirameki.minikuraVelocity

import cafe.kirameki.minikuraVelocity.utils.ProxyTransferUtils
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

object EndCommand {
    fun createEndCommand(proxy: ProxyServer): BrigadierCommand {
        val serverNode = BrigadierCommand.literalArgumentBuilder("end")
            .then(BrigadierCommand.requiredArgumentBuilder("forceEnd", StringArgumentType.word())
                .suggests { context: CommandContext<CommandSource?>?, builder: SuggestionsBuilder ->
                    builder.suggest("--force")
                    builder.buildFuture()
                }
                .executes { context: CommandContext<CommandSource> ->
                    val source = context.source
                    proxy.shutdown()
                    return@executes Command.SINGLE_SUCCESS
                }
            )
            .executes { context: CommandContext<CommandSource> ->
                val source = context.source
                ProxyTransferUtils.endProxy()
                return@executes Command.SINGLE_SUCCESS
            }
            .build()

        return BrigadierCommand(serverNode)
    }
}
