var Etcd = require('node-etcd')
var cadence = require('cadence')
var Delta = require('delta')
var turnstile = require('turnstile')
var abend = require('abend')

function Consensus (host, port, listener) {
    this._etcd = new Etcd(host, port)
    this._watcher = null
    this._listener = listener // <- error first callback, if we get an error we panic.
    this._turnstile = new turnstile.Turnstile
}

Consensus.prototype.stop = function () {
    if (this._watcher != null) {
        this._watcher.stop()
        console.log('stopped')
    }
}

Consensus.prototype.initialize = cadence(function (async) {
    async([function () {
        this._etcd.mkdir('/reconfigure', async())
    }, /^Not a file$/, function (error) {
        //already initialized
    }])
})

Consensus.prototype.set = cadence(function (async, key, val) {
// flat hierarchy so `val` should always be
    this._etcd.set('/reconfigure/' + key, val, async())
})

Consensus.prototype.get = cadence(function (async, key) {
// key will probably just be '/'
  this._etcd.get('/reconfigure/' + key, async())
})

Consensus.prototype._changed = turnstile.throttle(cadence(function (async) {
    async(function () {
        this._list('/reconfigure', async()) // <- error -> panic!
    }, function (object) {
        this._listener(object, async()) // <- error -> panic!
        // todo: what if there's a synchronous error? Are we going to stack them
        // up in the next tick queue?
        // ^^^ should, we don't know how, use Cadence exceptions to do the right
        // thing.
    })
}))

Consensus.prototype.watch = cadence(function (async) {
    this._watcher = this._etcd.watcher('/reconfigure', null, { recursive: true })
    new Delta(async()).ee(this._watcher).on('change', function (whatIsThis) {
        // ^^^ change
        console.log(arguments)
        this._changed(abend)
    }.bind(this)).on('stop')
})

function main () {
    consesus.watch(abend)
}

module.exports = Consensus
