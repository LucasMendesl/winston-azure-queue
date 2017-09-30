const { isFunction }   = require('util');
const { Transport }    = require('winston');
const { promisifyAll } = require('bluebird');
const { hostname }     = require('os');
const azure            = promisifyAll(require('azure-storage'));

class AzureQueueTransport extends Transport {

    constructor(options) {         
        super(options);

        options = options || {};
            
        this.name = 'azureQueueTransport';
        this.silent = options.silent                     || false;
        this.level = options.level                       || 'info';
        this.queueName = options.queueName               || 'logs';
        this.pid = options.pid                           || process.pid;
        this.env = options.env                           || process.env.NODE_ENV;
        
        this.storageAccount = options.storageAccount     || process.env.AZURE_STORAGE_ACCOUNT;
        this.storageAccessKey = options.storageAccessKey || process.env.AZURE_STORAGE_ACCESS_KEY;
        
        if (!this.storageAccount) throw new Error('invalid azure storage account!');
        if (!this.storageAccessKey) throw new Error('invalid azure storage access key!');
                
        this._queueService = this._createService().createQueueIfNotExistsAsync(this.queueName)
                                  .catch(e => { this.emit('error', e); });
    }

    _createService () {
        return this.env === 'development' ?
            azure.createQueueService('UseDevelopmentStorage=true') :
            azure.createQueueService(options.storageAccount, options.storageAccessKey)
    }
}

module.exports = { AzureQueueTransport };