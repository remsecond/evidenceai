import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const processingErrors = new Rate('processing_errors');
const memoryUsage = new Rate('memory_usage');
const concurrentOps = new Rate('concurrent_operations');
const queueLength = new Rate('queue_length');
const batchSize = new Rate('batch_size');
const processingTime = new Rate('processing_time');

// Test configuration
export const options = {
    scenarios: {
        // Test concurrent small documents
        small_docs: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 20 },   // Normal load
                { duration: '5m', target: 20 },   // Sustained normal load
                { duration: '2m', target: 50 },   // High load
                { duration: '5m', target: 50 },   // Sustained high load
                { duration: '2m', target: 0 },    // Cool down
            ],
        },
        // Test large document processing
        large_docs: {
            executor: 'constant-vus',
            vus: 5,
            duration: '10m',
            startTime: '5m',
        },
        // Test mixed workload
        mixed_load: {
            executor: 'ramping-arrival-rate',
            startRate: 1,
            timeUnit: '1s',
            preAllocatedVUs: 20,
            maxVUs: 100,
            stages: [
                { duration: '5m', target: 10 },   // Gradual increase
                { duration: '10m', target: 10 },  // Sustained mixed load
                { duration: '5m', target: 0 },    // Gradual decrease
            ],
        }
    },
    thresholds: {
        'http_req_duration': ['p(95)<5000'],     // 95% of requests under 5s
        'http_req_failed': ['rate<0.05'],        // Less than 5% failures
        'processing_errors': ['rate<0.03'],       // Less than 3% processing errors
        'memory_usage': ['value<0.8'],           // Memory usage below 80%
        'concurrent_operations': ['value<50'],    // Max 50 concurrent operations
        'queue_length': ['p(90)<100'],           // 90% of queue lengths under 100
        'batch_size': ['p(95)<1000'],           // 95% of batches under 1000 items
        'processing_time': ['p(95)<10000'],      // 95% of processing under 10s
    },
};

// Generate test data of varying sizes
function generateTestData(size = 'small') {
    const baseEmail = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: new Date().toISOString(),
    };

    switch (size) {
        case 'large':
            // Large email with multiple threads and attachments
            return {
                ...baseEmail,
                subject: 'Large Test Email with History',
                content: generateLargeEmailContent(),
                threadCount: 20,
                attachments: true
            };
        case 'medium':
            // Medium email with some history
            return {
                ...baseEmail,
                subject: 'Medium Test Email',
                content: generateMediumEmailContent(),
                threadCount: 5,
                attachments: false
            };
        default:
            // Small single email
            return {
                ...baseEmail,
                subject: 'Small Test Email',
                content: 'This is a simple test email for load testing.',
                threadCount: 0,
                attachments: false
            };
    }
}

// Generate large email content with threads
function generateLargeEmailContent() {
    let content = 'This is a complex email thread with multiple messages and detailed content.\n\n';
    
    // Add multiple quoted sections and responses
    for (let i = 0; i < 20; i++) {
        content += `On ${new Date(Date.now() - i * 86400000).toISOString()}, User${i} wrote:\n`;
        content += `> Message content for thread ${i}\n`;
        content += `> With multiple lines\n`;
        content += `> And various details\n\n`;
        content += `Response to message ${i}\n\n`;
    }

    return content;
}

// Generate medium-sized email content
function generateMediumEmailContent() {
    let content = 'This is a medium-sized email with some history.\n\n';
    
    for (let i = 0; i < 5; i++) {
        content += `On ${new Date(Date.now() - i * 86400000).toISOString()}, User wrote:\n`;
        content += `> Previous message ${i}\n\n`;
        content += `Response\n\n`;
    }

    return content;
}

// Main test function
export default function () {
    // Get scenario name
    const scenario = exec.scenario.name;
    
    // Generate appropriate test data based on scenario
    let testData;
    switch (scenario) {
        case 'large_docs':
            testData = generateTestData('large');
            break;
        case 'mixed_load':
            testData = generateTestData(Math.random() > 0.7 ? 'large' : 
                                     Math.random() > 0.5 ? 'medium' : 'small');
            break;
        default:
            testData = generateTestData('small');
    }

    // Track start time for processing duration
    const startTime = Date.now();

    // 1. Process email
    const processResponse = http.post('http://app:3000/api/process', {
        type: 'email',
        content: JSON.stringify(testData)
    });
    
    // Track metrics
    const duration = Date.now() - startTime;
    processingTime.add(duration);
    
    // Get and track resource metrics
    const metrics = JSON.parse(processResponse.headers['X-Resource-Metrics'] || '{}');
    memoryUsage.add(metrics.memoryUsage || 0);
    concurrentOps.add(metrics.concurrentOps || 0);
    queueLength.add(metrics.queueLength || 0);
    batchSize.add(metrics.batchSize || 0);
    
    // Check response
    check(processResponse, {
        'process status is 200': (r) => r.status === 200,
        'process response has analysis': (r) => r.json().analysis !== undefined,
        'memory usage within limits': () => metrics.memoryUsage < 0.8,
        'queue length acceptable': () => metrics.queueLength < 100,
    }) || processingErrors.add(1);
    
    // 2. Get timeline if available
    if (processResponse.status === 200) {
        const timelineResponse = http.get(`http://app:3000/api/timeline/${processResponse.json().id}`);
        check(timelineResponse, {
            'timeline status is 200': (r) => r.status === 200,
            'timeline has events': (r) => r.json().events !== undefined,
        });
    }
    
    // Variable sleep based on scenario
    switch (scenario) {
        case 'large_docs':
            sleep(Math.random() * 10 + 5); // 5-15s between large docs
            break;
        case 'mixed_load':
            sleep(Math.random() * 5 + 2);  // 2-7s for mixed load
            break;
        default:
            sleep(Math.random() * 3 + 1);  // 1-4s for small docs
    }
}

// Setup function (runs once per VU)
export function setup() {
    // Verify API is accessible
    const healthCheck = http.get('http://app:3000/health');
    check(healthCheck, {
        'health check passed': (r) => r.status === 200,
    });
}

// Teardown function (runs once per VU)
export function teardown(data) {
    // Cleanup if needed
}

// Handle test lifecycle
export function handleSummary(data) {
    return {
        'stdout': JSON.stringify({
            metrics: {
                http_req_duration: data.metrics.http_req_duration,
                processing_errors: data.metrics.processing_errors,
                vus: data.metrics.vus,
            },
            checks: data.metrics.checks,
        }, null, 2),
        './load-test-summary.json': JSON.stringify(data, null, 2),
    };
}
