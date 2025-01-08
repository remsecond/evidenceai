# EvidenceAI Deployment Guide

## Overview

EvidenceAI uses a containerized deployment strategy with comprehensive monitoring. The system consists of:

- Main application service
- Neo4j database
- Prometheus metrics collection
- Grafana dashboards
- Health monitoring

## Prerequisites

- Docker and Docker Compose
- Node.js 20 or later
- Access to required services:
  - OpenAI API
  - Pinecone
  - Neo4j (can be local or hosted)

## Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure required variables:
```
# Required API Keys
OPENAI_API_KEY=your-key
PINECONE_API_KEY=your-key
PINECONE_ENVIRONMENT=your-environment

# Neo4j Configuration
NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Monitoring
GRAFANA_ADMIN_PASSWORD=your-password
```

## Deployment

The deployment script (`scripts/deploy.sh`) handles the entire deployment process:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Full deployment
./scripts/deploy.sh

# Individual steps
./scripts/deploy.sh validate      # Check environment
./scripts/deploy.sh check-docker  # Verify Docker setup
./scripts/deploy.sh deploy        # Deploy services
./scripts/deploy.sh check-monitoring  # Verify monitoring
```

## Service Endpoints

After deployment, services are available at:

- Application: http://localhost:3000
- Grafana Dashboards: http://localhost:3001
- Prometheus Metrics: http://localhost:9090
- Neo4j Browser: http://localhost:7474

## Monitoring Dashboard

The Grafana dashboard provides visibility into:

1. Processing Metrics
   - Document processing times
   - AI model response times
   - Error rates

2. AI Model Usage
   - Token consumption
   - Model distribution
   - Cost tracking

3. Pattern Detection
   - Detected patterns
   - Relationship mappings
   - Timeline generations

4. System Health
   - Service status
   - Resource utilization
   - API performance

## Health Checks

The system includes automated health checks for all services:

- Application: `/health`
- Neo4j: Connection test
- Prometheus: `/-/healthy`
- Grafana: `/api/health`

Health checks run every 30 seconds and are visible in the monitoring dashboard.

## Scaling Considerations

The system is designed to scale horizontally:

1. Application Service
   - Configurable through `MIN_INSTANCES` and `MAX_INSTANCES`
   - Auto-scaling based on CPU/Memory usage

2. Neo4j Database
   - Supports clustering for high availability
   - Configurable through Neo4j configuration

3. Monitoring Stack
   - Prometheus retention configurable via `PROMETHEUS_RETENTION_DAYS`
   - Grafana supports multiple data sources

## Troubleshooting

Common issues and solutions:

1. Service Won't Start
   ```bash
   # Check service logs
   docker-compose logs [service-name]
   
   # Verify environment
   ./scripts/deploy.sh validate
   ```

2. Monitoring Issues
   ```bash
   # Check monitoring stack
   ./scripts/deploy.sh check-monitoring
   
   # Restart monitoring services
   docker-compose restart prometheus grafana
   ```

3. Database Connection Issues
   ```bash
   # Check Neo4j status
   docker-compose ps neo4j
   
   # Verify connection
   docker-compose exec neo4j cypher-shell -u neo4j -p $NEO4J_PASSWORD
   ```

## Backup and Recovery

1. Database Backups
   - Automated backups configured via `BACKUP_ENABLED`
   - Retention period: `BACKUP_RETENTION_DAYS`
   - Location: `./backups`

2. Configuration Backups
   - Environment variables
   - Grafana dashboards
   - Prometheus rules

## Security Considerations

1. API Security
   - Rate limiting configured via `RATE_LIMIT_*` variables
   - CORS configuration in `CORS_ORIGINS`
   - JWT authentication required

2. Database Security
   - Neo4j authentication required
   - TLS encryption for remote connections
   - Regular security updates

3. Monitoring Security
   - Grafana authentication required
   - Prometheus restricted access
   - Secure metric collection

## Maintenance

Regular maintenance tasks:

1. Log Rotation
   - Configured through Docker
   - Retention period configurable

2. Updates
   ```bash
   # Pull latest images
   docker-compose pull
   
   # Rebuild application
   docker-compose build --no-cache app
   
   # Deploy updates
   ./scripts/deploy.sh deploy
   ```

3. Monitoring
   - Review dashboards regularly
   - Adjust alert thresholds as needed
   - Update visualization as requirements change

## Support

For issues or questions:

1. Check logs:
   ```bash
   docker-compose logs --tail=100 [service-name]
   ```

2. Check monitoring:
   - Review Grafana dashboards
   - Check Prometheus metrics
   - Verify service health status

3. Contact support:
   - Include relevant logs
   - Provide environment details
   - Describe steps to reproduce issues
