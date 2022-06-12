import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Vpc, SubnetType} from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

import { ImagePullPrincipalType } from 'aws-cdk-lib/aws-codebuild';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { EcsDeploymentGroup, EcsApplication } from 'aws-cdk-lib/aws-codedeploy';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { LogDriver } from 'aws-cdk-lib/aws-ecs';
const path = require('path');
const fs = require('fs');

/**
 * TODO: Set env - Bucket name
 */
const bucketName = '[[BUCKET_NAME]]';


export class AwsTestAutomationForDevopsUsingAwsCdkStack extends Stack {
  

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /*
    * VPC
    */
    const vpc = new Vpc(this, 'vpc-managedByCdk-demogo', {
      //This is where we define how many AZs to use
      maxAzs : 2, 
      
      //The CIDR range to use for the VPC
      cidr: '10.30.0.0/18',
      
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'sbn-pulic',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'sbn-private-app',
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        }
      ]
    });


    /*
    * ALB
    */
    const backendAlb = new elbv2.ApplicationLoadBalancer(this, 'backendAlb', {
      vpc,
      internetFacing: true,
    });

    const backendPrdListener = backendAlb.addListener('backendListener', {
      protocol: ApplicationProtocol.HTTP,
      port: 8080,
      open: true
    });

    /*
    * Role
    */

    //ecsTaskExcution role
    const ecsTaskExecutionRole = new Role(this, 'EcsExecutionRole',{
      roleName: 'EcsExecutionRole',
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
    });

    ecsTaskExecutionRole.addToPolicy(new PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ]
    }));

    ecsTaskExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    }));

    //Devops Role
    const devopsRole = new Role(this, 'DevOpsRole',{
      roleName: 'DevOpsRole',
      assumedBy: new iam.CompositePrincipal(
        new ServicePrincipal('codedeploy.amazonaws.com'),
        new ServicePrincipal('codebuild.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com'),
      )
    });

    devopsRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "codebuild:*",
        "codedeploy:*",
        "codepipeline:*",
        "ecr-public:*",
        "ecr:*",
        "ecs:*",
        "elasticloadbalancing:*",
        "iam:PassRole",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "s3:*",
        "devicefarm:CreateTestGridUrl",
        "cloudfront:CreateInvalidation"
      ]
    }));

    devopsRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
      ]
    }));

    /**
     * ECR
     */

    const demogoECRRep = new ecr.Repository(this, 'demogo-Repo', {
      repositoryName: 'demogo-user',
    });

    /*
    * ECS
    */
    //ECS 클러스터
    const ecsCluster = new ecs.Cluster(this, 'cluster-demogo',{
      vpc: vpc
    });

    //ECS Taskdefs
    const userTaskDefinition = new ecs.FargateTaskDefinition(this, 'userTaskDef', {
      cpu: 512,
      memoryLimitMiB: 1024,
      executionRole: ecsTaskExecutionRole,
      taskRole: ecsTaskExecutionRole,
    });

    //Container
    const userContainer = userTaskDefinition.addContainer("user", {
      containerName: 'user-app',
      image: ecs.ContainerImage.fromEcrRepository(demogoECRRep),
      logging: LogDriver.awsLogs({
        streamPrefix: 'ecs/demogo-user'
      })
    });

    userContainer.addPortMappings({
      containerPort:8080,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP,
    });

    
    //Service
    const userService = new ecs.FargateService(this, 'userService', {
        serviceName: 'user',
        cluster: ecsCluster,
        taskDefinition: userTaskDefinition,
        desiredCount: 0,
    });

    userService.registerLoadBalancerTargets(
      {
        containerName: 'user-app',
        containerPort: 8080,
        newTargetGroupId: 'ECS-user',
        listener: ecs.ListenerConfig.applicationListener(backendPrdListener,{
          protocol: elbv2.ApplicationProtocol.HTTP,
          healthCheck:{
            path: "/user/health-check"
          },
          deregistrationDelay: Duration.seconds(2),
        })
      }
    )

    /**
     * Front-end S3 Bucket
     */

    const feBucket = new Bucket(this, 'feBucket', {
      bucketName: bucketName, 
      publicReadAccess: false,
    });
    
    /**
     * CloudFront
     */
    const feDistribution = new cloudfront.Distribution(this, 'feDist',{
      defaultBehavior:{origin: new origins.S3Origin(feBucket)},
    });

    /*
    * CodeCommit
    */
    const appUserRepo = new codecommit.Repository(this, 'appUserRepo',{
      repositoryName: 'codecommit-demogo-user',
      code: codecommit.Code.fromDirectory(path.join(__dirname, '../code/app/user/'), 'master')
    });

    const userSourceOutput = new codepipeline.Artifact();

    const userSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'UserRepo_SourceMerge',
      repository: appUserRepo,
      output: userSourceOutput,
      branch: 'master'
    });

    //Frontend
    const appFrontendUserRepo = new codecommit.Repository(this, 'appFrontendUserRepo',{
      repositoryName: 'codecommit-demogo-frontend-user',
      code: codecommit.Code.fromDirectory(path.join(__dirname, '../code/app/demogo-fe-user/'), 'master')
    });

    const userFrontendSourceOutput = new codepipeline.Artifact();

    const userFrontendSourceAction = new codepipeline_actions.CodeCommitSourceAction({
      actionName: 'UserFrontendRepo_SourceMerge',
      repository: appFrontendUserRepo,
      output: userFrontendSourceOutput,
      branch: 'master'
    });

    /**
     * CodeBuild
     */

    const userProject = new codebuild.PipelineProject(this, 'demogoUserProject', {
      projectName: "demogo-user-build",
      role: devopsRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true
      }
    });

    const userBuildOutput = new codepipeline.Artifact();
    const userBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: userProject,
      input: userSourceOutput,
      outputs: [userBuildOutput],
      role: devopsRole
    });

    const userTestProject = new codebuild.PipelineProject(this, 'userTestProject', {
      projectName: "demogo-user-api-test",
      role: devopsRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_test.yml')
    });

    const userTestOutput = new codepipeline.Artifact();
    const userTestaction = new codepipeline_actions.CodeBuildAction({
      actionName: 'UI-Test',
      project: userTestProject,
      input: userSourceOutput,
      outputs: [userTestOutput]
    });

    const userFrontendBuildProject = new codebuild.PipelineProject(this, 'demogoFrontendUserProject', {
      projectName: "demogo-fe-user-build",
      role: devopsRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true
      }
    });

    const userFrontendBuildOutput = new codepipeline.Artifact();
    const userFrontendBuildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: userFrontendBuildProject,
      input: userFrontendSourceOutput,
      outputs: [userFrontendBuildOutput],
    });

    const userFrontendDeployProject = new codebuild.PipelineProject(this, 'userFrontendDeployProject', {
      projectName: "demogo-fe-user-deploy",
      role: devopsRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_deploy.yml')
    });

    const userFrontendDeployOutput = new codepipeline.Artifact();
    const userFrontendDeployAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Deploy',
      project: userFrontendDeployProject,
      input: userFrontendBuildOutput,
      outputs: [userFrontendDeployOutput]
    });

    const userFrontendTestProject = new codebuild.PipelineProject(this, 'userFrontendTestProject', {
      projectName: "demogo-fe-user-ui-test",
      role: devopsRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        privileged: true
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec_test.yml'),
    });

    const userFrontendTestOutput = new codepipeline.Artifact();
    const userFrontendTestaction = new codepipeline_actions.CodeBuildAction({
      actionName: 'UI-Test',
      project: userFrontendTestProject,
      input: userFrontendSourceOutput,
      outputs: [userFrontendTestOutput]
    });

    /*
    ** CodeDeploy
    */

     const userDeployAction = new codepipeline_actions.EcsDeployAction({
       actionName: 'user-Container-Deploy',
       service: userService,
       input: userBuildOutput,
     });

     const userCodePipeline = new codepipeline.Pipeline(this, 'userCodePipeline', {
       pipelineName: 'pipeline-demogo-user',
       role: devopsRole,
       stages:[
         {
           stageName: 'Source',
           actions: [userSourceAction],
         },
         {
           stageName: 'Build',
           actions: [userBuildAction],
         },
         {
           stageName: 'Deploy',
           actions: [userDeployAction],
         },
         {
           stageName: 'Test',
           actions: [userTestaction],
         }
       ]
     });

     const userFrontendCodePipeline = new codepipeline.Pipeline(this, 'userFrontendCodePipeline', {
      pipelineName: 'pipeline-demogo-frontend-user',
      role: devopsRole,
      stages:[
        {
          stageName: 'Source',
          actions: [userFrontendSourceAction],
        },
        {
          stageName: 'Build',
          actions: [userFrontendBuildAction],
        },
        {
          stageName: 'Deploy',
          actions: [userFrontendDeployAction],
        },
        {
          stageName: 'Test',
          actions: [userFrontendTestaction],
        }
      ]
    });
  }
}
