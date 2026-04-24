#!/usr/bin/env bash

set -e

ENDPOINT="http://localhost:4566"
QUEUE_NAME="epr-laps-costdata-form.fifo"
TOPIC_NAME="epr-laps-local-feedback-topic.fifo"

echo "Getting FIFO SQS queue..."
QUEUE_URL=$(aws --endpoint-url=$ENDPOINT sqs get-queue-url \
  --queue-name $QUEUE_NAME \
  --query 'QueueUrl' \
  --output text)

echo "Queue URL: $QUEUE_URL"

QUEUE_ARN=$(aws --endpoint-url=$ENDPOINT sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "Queue ARN: $QUEUE_ARN"

echo "Creating FIFO SNS topic..."
TOPIC_ARN=$(aws --endpoint-url=$ENDPOINT sns create-topic \
  --name $TOPIC_NAME \
  --attributes FifoTopic=true \
  --query 'TopicArn' \
  --output text)

echo "Topic ARN: $TOPIC_ARN"

echo "Creating policy file..."

cat > policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "$QUEUE_ARN",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "$TOPIC_ARN"
        }
      }
    }
  ]
}
EOF

echo "Applying queue policy..."
aws --endpoint-url=$ENDPOINT sqs set-queue-attributes \
  --queue-url $QUEUE_URL \
  --attributes Policy=file://policy.json

echo "Subscribing SQS to SNS..."
aws --endpoint-url=$ENDPOINT sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol sqs \
  --notification-endpoint $QUEUE_ARN

echo "Publishing message to SNS..."
aws --endpoint-url=$ENDPOINT sns publish \
  --topic-arn $TOPIC_ARN \
  --message "Hello message" \
  --message-group-id "group-1" \
  --message-deduplication-id "$(uuidgen)"

echo "Done."