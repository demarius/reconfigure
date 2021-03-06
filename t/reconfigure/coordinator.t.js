require('proof')(8, require('cadence')(prove))

function prove (async, assert) {
    var Coordinator = require('../../reconfigure/coordinator')
    var con = {
        added: false,
        listeners: false,
        initialize: function (callback) {
            callback(null)
        },
        addListener: function (url, callback) {
            if (this.added) {
                callback(null, false, true)
            } else {
                this.added = true
                callback(null, true, false)
            }
        },
        removeListener: function (url, callback) {
            callback(null, true)
        },
        listeners: function (callback) {
            callback(null, [['127.0.0.1:8081']])
        },
        list: function (callback) {
            callback(null, { key: 'a val', anotherkey: 'a val' })
        }
    }

    var ua = {
        added: false,
        update: function (url, properties, callback) {
            if (!this.added) {
                callback(null, false)
                this.added = true
            } else { callback(null, true) }
        }
    }

    var coordinator = new Coordinator(con, ua)

    async(function () {
        con.initialize(async())
    }, function () {
        coordinator.listen('127.0.0.1:8081', async())
    }, function (listening) {
        assert(listening.success, true, 'listen on 8081')
    }, function () {
        coordinator.listen('127.0.0.1:8081', async())
    }, function (listening) {
        assert(listening.duplicate, true, 'dupe registry attempt')
        assert(listening.success, false, 'no dupes')
    }, function () {
        coordinator.listeners('127.0.0.1:8081', async())
    }, function (list) {
        assert(list[0][0], '127.0.0.1:8081', 'got registry')
        coordinator.retry(async()) //empty run for coverage
    }, function () {
        coordinator.update(async()) // fail so we can retry
    }, function () {
        assert(coordinator._failed, { '127.0.0.1:8081': true }, 'waiting to retry')
        coordinator.update(async()) // test update
    }, function (updated) {
        assert(updated, true, 'updated')
        coordinator.retry(async()) // test retry
    }, function () {
        assert(coordinator._failed, {}, 'retried')
        ua.added = false
        coordinator._failed['127.0.0.1:8081'] = true // screw up the state and
                                                     // retry, should be ok
        coordinator.retry(async()) // test retry
    }, function () {
        coordinator.unlisten('127.0.0.1:8081', async())
    }, function (unlisten) {
        assert(unlisten, true, 'unlisten on 8081')
    })
}
