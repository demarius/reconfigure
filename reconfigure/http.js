var cadence = require('cadence')
var Dispatcher = require('inlet/dispatcher')
var logger = require('prolific').createLogger('diverter.allocator')
var useragent = require('./ua')

function Reconfigure (coordinator) {
    this._coordinator = coordinator
}

Reconfigure.prototype.dispatcher = function (options) {
    var dispatcher = new Dispatcher(this)
    dispatcher.dispatch('GET /', 'index')
    dispatcher.dispatch('POST /register', 'register')
    dispatcher.dispatch('POST /deregister', 'deregister')
    dispatcher.dispatch('GET /registered', 'registered')
    dispatcher.dispatch('POST /set', 'set')
    dispatcher.dispatch('GET /list', 'list')
    return dispatcher.createDispatcher()
}

Reconfigure.prototype.index = cadence(function (async) {
    return 'Reconfigure API'
})

Reconfigure.prototype.register = cadence(function (async, post) {
    async(function () {
        this._coordinator.listen(post.body.url, async())
    }, function (res) {
        return {
            extant: res.duplicate,
            url: post.body.url,
            success: true
        }
    })
})

Reconfigure.prototype.deregister = cadence(function (async, post) {
    async(function () {
        this._coordinator.unlisten(post.body.url, async())
    }, function () {
        return {
            url: post.body.url,
            success: true
        }
    })
})

Reconfigure.prototype.set = cadence(function (async, post) {
    async(function () {
        this._coordinator.set(post.body.key, post.body.value, async())
    }, function () {
        return {
            key: post.body.key,
            value: post.body.value,
            success: true
        }
    })
})

Reconfigure.prototype.list = cadence(function (async) {
    async(function () {
        this._coordinator.list(async())
    }, function (list) {
        return { values: list }
    })
})

Reconfigure.prototype.registered = cadence(function (async) {
    async(function () {
        this._coordinator.listeners(async())
    }, function (list) {
        return { listeners: list }
    })
})

module.exports = Reconfigure
