const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const { hostname } = require('os');
const { AzureQueueTransport } = require('../lib/index');

chai.config.includeStack = true;
process.env.NODE_ENV = 'test';

const credentials = {
    storageAccount: 'fakestoragename',
    storageAccessKey: new Buffer('fakeaccountkey').toString('base64')
}

describe('azure queue logger', () => {
    let serviceClient,
        inputData = {
            message: 'message',
            level: 'info',
            host: hostname(),
            env: process.env.NODE_ENV,
            pid: process.pid
        },
        noop = () => {}

    beforeEach(() => {
        serviceClient = {
            createQueue: sinon.stub(),
            getQueueClient: sinon.stub()
        }
    })

    describe('create instance from transport service', () => {

        it('should fail if no storage account specified', () => {
            expect(() => {
                new AzureQueueTransport();
            }).to.throw('invalid azure storage account!');
        });

        it('should fail if no storage account key specified', () => {
            expect(() => {
                new AzureQueueTransport({
                    storageAccount: credentials.storageAccount
                });
            }).to.throw('invalid azure storage access key!');
        });

        it('should fail if create queue method throws exception', done => {
            serviceClient.createQueue.rejects('error')

            new AzureQueueTransport({
                    serviceClient
                })
                .on('error', message => {
                    expect(message).to.not.be.null;
                    done();
                });
        });

        it('should create a azure queue transport instance', () => {
            serviceClient.createQueue.resolves({})
            serviceClient.getQueueClient.returns({})

            let transport = new AzureQueueTransport({
                serviceClient
            });

            expect(transport.queueName).to.be.not.null;
            expect(transport.level).to.be.not.null;
            expect(transport.silent).to.be.false;
            expect(transport.pid).to.not.be.null;
            expect(transport.env).to.be.equal(process.env.NODE_ENV);
            expect(transport._queueService).to.be.not.null;
        });
    });

    describe('log messages in queue', () => {

        it('should not log when silent configuration is true', () => {
            serviceClient.createQueue.resolves({})
            serviceClient.getQueueClient.returns({
                sendMessage: sinon.stub()
            })

            const azureTransport = new AzureQueueTransport({
                serviceClient,
                silent: true
            })

            sinon.assert.notCalled(azureTransport._queueService.sendMessage)
        });

        it('should log message in queue', () => {
            serviceClient.createQueue.resolves({})
            serviceClient.getQueueClient.returns({
                sendMessage: sinon.stub().withArgs(JSON.stringify(inputData)).resolves({})
            })

            const azureTransport = new AzureQueueTransport({
                serviceClient
            })

            azureTransport.log('info', 'message', noop);
            sinon.assert.calledOnce(azureTransport._queueService.sendMessage)
        });

        it('should log message with metadata in queue', () => {
            const meta = { metaInfo: 'metaInfo', exampleStack: 'exampleStack' };

            serviceClient.createQueue.resolves({})
            serviceClient.getQueueClient.returns({
                sendMessage: sinon.stub().withArgs(JSON.stringify(Object.assign(inputData, meta))).resolves({})
            })

            const azureTransport = new AzureQueueTransport({
                serviceClient
            })

            azureTransport.log('info', 'message', meta, noop);
            sinon.assert.calledOnce(azureTransport._queueService.sendMessage)
        });

        afterEach(() => {
            serviceClient.createQueue.reset()
            serviceClient.getQueueClient.reset()
        });
    });
});