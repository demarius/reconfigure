var cadence = require('cadence')

function Coordinator (consensus, ua) {
    this._consensus = consensus
    this._ua = ua
    this._failed= {}
}

Coordinator.prototype.listen = cadence(function (async, url) { // <- listen, POST, -> get them started
    async(function () {
        this._consensus.addListener(url, async())
    }, function (success, dupe) {
        return {
            success: success,
            duplicate: dupe
        }
    })
})

Coordinator.prototype.unlisten = cadence(function (async, url) {
    this._consensus.removeListener(url, async())
})

Coordinator.prototype.list = cadence(function (async) {
    this._consensus.list(async())
})

Coordinator.prototype.update = cadence(function (async) {
    async(function () {
        this._consensus.listeners(async())
        this.list(async())
    }, function (urls, list) {
        async.forEach(function (url) {
            async(function () {
                this._ua.update(url, list, async())
            }, function (ok) {
                if (!ok) {
                    this._failed[url] = true
                }
            })
        })(urls)
    })
})

Coordinator.prototype.retry = cadence(function (async) {
    var failed = Object.keys(this._failed)
    if (!failed.length) return
    this._failed = {}
    async(function () {
        this.list(async())
        this._consensus.listeners(async())
    }, function (list, listeners) {
        async.forEach(function (url) {
            if (listeners[0].indexOf(url) != -1) {
                async(function () {
                    this._ua.update(url, list, async())
                }, function (ok) {
                    if (!ok) {
                        this._failed[url] = true
                    }
                })
            }
        })(failed)
    })
})

Coordinator.prototype.set = cadence(function (async, key, value) {
    this._consensus.set(key, value, async())
})

Coordinator.prototype.listeners = cadence(function (async) {
    this._consensus.listeners(async())
})

module.exports = Coordinator
