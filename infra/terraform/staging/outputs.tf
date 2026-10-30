output "server_instance_id" {
  description = "ID of the server, for SSM sessions and the deploy workflow"
  value       = aws_instance.server.id
}

output "server_public_ip" {
  description = "Public IP of the server, used for its outbound traffic only"
  value       = aws_instance.server.public_ip
}
