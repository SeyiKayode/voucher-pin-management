import { Stack, StackProps, Duration, Expiration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class LipaworldTaskStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lipaworldTable = new ddb.Table(this, 'LipaworldTable', {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'item',
        type: ddb.AttributeType.STRING,
      },
      deletionProtection: true,
      encryption: ddb.TableEncryption.DEFAULT
    });

    lipaworldTable.addGlobalSecondaryIndex({
      indexName: 'partitionType-item-index',
      partitionKey: {
        name: 'partitionType',
        type: ddb.AttributeType.STRING,
      },
      sortKey: {
        name: 'item',
        type: ddb.AttributeType.STRING,
      }
    });

    const schema = new appsync.SchemaFile({ filePath: 'graphql/schema.graphql' })
    const graphqlApi = new appsync.GraphqlApi(this, 'GraphqlApi', {
      name: `lipaworld-API`,
      definition: appsync.Definition.fromSchema(schema),
      authorizationConfig: {
        defaultAuthorization: {
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: Expiration.after(Duration.days(365))
          }
        },
      },
      xrayEnabled: true
    });

    const lambdaPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          resources: ['*'],
          actions: ['*'],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    const lambdaRole = new iam.Role(this, 'lambdaAccessRole', {
      roleName: `LambdaAccessRole-lipaworld`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        customPolicy: lambdaPolicy
      }
    });

    const lipaworldLambda = new lambda.Function(this, 'AppSyncLipaworldHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'main.handler',
      role: lambdaRole,
      code: lambda.Code.fromAsset('src'),
      memorySize: 1024,
      timeout: Duration.seconds(120)
    });

    const lambdaDataSource = graphqlApi.addLambdaDataSource('lambdaDatasource', lipaworldLambda);

    lambdaDataSource.createResolver('MutationGenerateVoucherCodeResolver', {
      typeName: 'Mutation',
      fieldName: 'generateVoucherCode'
    });

    lambdaDataSource.createResolver('QueryGetVoucherCodeResolver', {
      typeName: 'Query',
      fieldName: 'getVoucherCode'
    });

    const schedulerLambda = new lambda.Function(this, 'SchedulerLambdaFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src/schedulerLambdaFn'),
      role: lambdaRole,
      memorySize: 1024,
      timeout: Duration.seconds(180)
    });

    const rule = new events.Rule(this, 'ScheduleRule', {
      schedule: events.Schedule.cron({ minute: '30', hour: '22' })
    });

    rule.addTarget(new targets.LambdaFunction(schedulerLambda));

    lipaworldTable.grantFullAccess(lipaworldLambda);
    lipaworldTable.grantFullAccess(schedulerLambda);
    lipaworldLambda.addEnvironment("LIPAWORLD_VOUCHER_TABLE", lipaworldTable.tableName)
    schedulerLambda.addEnvironment("LIPAWORLD_VOUCHER_TABLE", lipaworldTable.tableName)
  }
};