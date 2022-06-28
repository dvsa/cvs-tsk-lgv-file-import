# EVL Data File Push

A typescript lambda function that takes an S3 bucket event, processes the file to meet business requirements, and pushes the file to an SFTP server.

## Requirements

- node v14
- npm v8
- aws cli v2

## Prerequisites

- Create a `.env` file from `.env.example` and replace holding values with valid ones
- run `npm run tools-setup`
- run `npm i`
- Install [git-secrets](https://github.com/awslabs/git-secrets) and do a one-time set up with `git secrets --register-aws`

## Run Lambda Locally

There are two options to run the lambda locally.

### Start

Run `npm run start`. This will instruct serverless offline to 'start' the lambda, which will create an instance of the lambda and wait to be called. Once running you can invoke the lambda using AWS CLI. An example command:

```
aws lambda invoke --endpoint-url http://localhost:3002 --function-name cvs-tsk-enquiry-evl-file-push-dev-evlFilePush --invocation-type Event --payload fileb://s3event.json response.json
```

You can keep invoking the lambda until you shutdown the serverless offline process. The s3event.json file used above, can be found in the test/resources folder.

### Invoke

Run `npm run debug`. This will instruct serverless offline to 'invoke' the lambda with a payload and then stop. The actual process involves a number of steps.

- Start serverless-s3-local
- Create an instance of the lambda
- Invoke the lambda with a payload
- Stop serverless-s3-local

## Debug Lambdas Locally

There are three debug configurations setup for vscode.

- Debug Jest Tests: runs `jest` with the debugger attached
- Debug Start: runs `npm run start` with the debugger attached
- Debug Invoke: runs `npm run debug` with the debugger attached

There is an issue with the last two configurations. The debugger does not automatically close after the debugging session. It needs to be manually stopped before you can start a new session.

## SonarQube Scanning

SonarQube code coverage analysis has been added as part of the git prepush hook. This is to better align with what happens in the pipeline.  
To get it working locally, follow these steps:

- Ensure SonarQube is installed. Running in a [container](https://hub.docker.com/_/sonarqube) is a great option
- Within SonarQube, Disable Force user authentication via Administration -> Configuration -> Security
- Install jq with `sudo apt install jq` or `brew install jq`

When running `git push`, it will run tests followed by the SonarQube scan. If the scan fails or the unit test coverage is below 80%, the push is cancelled.

## Tests

- The [Jest](https://jestjs.io/) framework is used to run tests and collect code coverage
- To run the tests, run the following command within the root directory of the project: `npm test`
- Coverage results will be displayed on terminal and stored in the `coverage` directory
- The coverage requirements can be set in `jest.config.js`

## Logging

The logger module is located in `./util/logger/`. This is making use of the Winston logging library. Unlike the default console logging, it enables logging levels. The default level is info. This can be adjusted using an environmental variable called `LOG_LEVEL`. The `LOG_LEVEL` values used in this project are `debug`, `info`, `error` and are case sensitive.
