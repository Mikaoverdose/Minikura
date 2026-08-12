package cafe.kirameki.minikuraVelocity.models

import cafe.kirameki.minikuraVelocity.models.components.ServerType
import java.time.LocalDateTime

data class ServerData(
    val id: String,
    val type: ServerType,
    val description: String?,
    val listen_port: Int = 25565,
    val connection_address: String,
    val memory: String = "1G",
    val env_variables: List<CustomEnvironmentVariableData> = emptyList(),
    val api_key: String,
    val created_at: String,
    val updated_at: String
)
