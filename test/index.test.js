const chai                     = require('chai'); 
const expect                   = chai.expect;
const sinon                    = require('sinon'); 
const { hostname }             = require('os'); 
const { Logger }               = require('winston');
const { AzureQueueTransport }  = require('../lib/index');

chai.config.includeStack       = true;
process.env.NODE_ENV           = 'test';

const credentials = {
    storageAccount: 'fakestoragename',
    storageAccessKey: new Buffer('fakeaccountkey').toString('base64'),
    connectionString: 'UseDevelopmentStorage=true'
};

describe('azure queue logger', () => {
        
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
           let transport = new AzureQueueTransport({
                storageAccount: credentials.storageAccount,
                storageAccessKey: credentials.storageAccessKey 
            })
            .on('error', message => {
                expect(message).to.not.be.null;
                done();
            });
        });
    
        it('should create a azure queue transport instance', () => {
            let transport = new AzureQueueTransport({
                connectionString: credentials.connectionString               
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
        let queueMock,
            inputData,
            azureTransport;

        beforeEach(() => {
            azureTransport = new AzureQueueTransport({
                connectionString: credentials.connectionString
            });
            
            queueMock = sinon.mock(azureTransport._queueService);

            inputData = {
                message: 'message',                
                level: 'info',
                host: hostname(),                
                env: process.env.NODE_ENV,
                pid: process.pid
            };
        });
        
        it('should not log when silent configuration is true', () => {
            azureTransport.silent = true;            
            queueMock.expects('createMessage').never();
        });
        
        it('should log message in queue', () => {
            queueMock.expects('createMessage').once().withArgs(azureTransport.queueName, JSON.stringify(inputData));                        
            azureTransport.log('info', 'message');
        });

        it('should log message with metadata in queue', () => {
            let meta = { metaInfo: 'metaInfo', exampleStack: 'exampleStack' };
            queueMock.expects('createMessage').once().withArgs(azureTransport.queueName, JSON.stringify(Object.assign(inputData, meta)));

            azureTransport.log('info', 'message', meta);
        });

        afterEach(() => {
            queueMock.restore();
        });
    });
});