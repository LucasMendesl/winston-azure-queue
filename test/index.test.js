const chai                     = require('chai');
const azure                    = require('azure-storage');
const expect                   = chai.expect;
const { Logger }               = require('winston');
const { AzureQueueTransport  } = require('../lib/index');

chai.config.includeStack       = true;
process.env.NODE_ENV           = 'development';

const credentials = {
    storageAccount: 'fakestoragename',
    storageAccessKey: new Buffer('fakeaccountkey').toString('base64')
};

describe('azure queue logger', () => {
    
    describe('create instance from transport service', () => {

        it('should fail if no storage account specified', () => {
            expect(() => {
                new AzureQueueTransport({});
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
            new AzureQueueTransport({
                storageAccount: credentials.storageAccount,
                storageAccessKey: credentials.storageAccessKey
            })
            .on('error', message => {
                expect(message).to.not.be.null;
                done();
            });
        });

        it('should create a azure queue transport instance', () => {            
            let logger = new AzureQueueTransport({
                storageAccount: credentials.storageAccount,
                storageAccessKey: credentials.storageAccessKey                 
            });

            expect(logger.pid).to.not.be.null;
            expect(logger.env).to.be.equal(process.env.NODE_ENV);
            expect(logger.storageAccount).to.be.equal(credentials.storageAccount);
            expect(logger.storageAccessKey).to.be.equal(credentials.storageAccessKey);
            expect(logger._queueService).to.be.not.null;
        });
    });
});