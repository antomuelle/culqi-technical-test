import type { AWS } from '@serverless/typescript';
import tokens from "@functions/tokens";
import recover from "@functions/recover";
import "dotenv/config"

const serverlessConfiguration: AWS = {
  service: 'culqi-technical-test',
  frameworkVersion: '3',
  useDotenv: true,
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
    region: 'us-east-2',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
    vpc: {
      securityGroupIds: [process.env.SECURITY_GROUP_ID],
      subnetIds: process.env.SUBNET_IDS.split(", "),
    }
  },
  // import the function via paths
  functions: { tokens, recover },
  package: { individually: true },
  plugins: [
    'serverless-esbuild',
    'serverless-offline',
    'serverless-dotenv-plugin'
  ],
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node18',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },
  },
};

module.exports = serverlessConfiguration;