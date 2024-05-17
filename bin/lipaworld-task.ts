#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LipaworldTaskStack } from '../lib/lipaworld-task-stack';

const app = new cdk.App();
new LipaworldTaskStack(app, 'LipaworldTaskStack');
