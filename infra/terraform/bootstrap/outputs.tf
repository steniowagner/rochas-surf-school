output "state_bucket_name" {
  description = "Name of the bucket the staging stack keeps its state in"
  value       = aws_s3_bucket.state.bucket
}
