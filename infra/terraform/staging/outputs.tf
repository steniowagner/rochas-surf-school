output "api_cname" {
  description = "CNAME to add at Hostinger so the API answers on its domain"
  value = {
    name  = aws_apigatewayv2_domain_name.main.domain_name
    value = aws_apigatewayv2_domain_name.main.domain_name_configuration[0].target_domain_name
  }
}

output "certificate_validation_cname" {
  description = "CNAME to add at Hostinger so ACM can issue the certificate"
  value = {
    name  = one(aws_acm_certificate.api.domain_validation_options).resource_record_name
    value = one(aws_acm_certificate.api.domain_validation_options).resource_record_value
  }
}

output "database_password" {
  description = "Password of the Supabase database, for the DATABASE_URL parameter"
  value       = random_password.database.result
  sensitive   = true
}

output "deploy_document_name" {
  description = "SSM document the deploy workflow runs"
  value       = aws_ssm_document.deploy.name
}

output "deploy_role_arn" {
  description = "Role the deploy workflow assumes through OIDC"
  value       = aws_iam_role.deploy.arn
}

output "server_instance_id" {
  description = "ID of the server, for SSM sessions and the deploy workflow"
  value       = aws_instance.server.id
}

output "server_public_ip" {
  description = "Public IP of the server, used for its outbound traffic only"
  value       = aws_instance.server.public_ip
}

output "supabase_project_ref" {
  description = "Reference of the Supabase project, part of the pooler's user name"
  value       = supabase_project.main.id
}
