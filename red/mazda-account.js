let MazdaClient = require('node-mymazda').default

module.exports = function (RED) {
  let Accounts = new Map()

  function MazdaAccount(config) {
    RED.nodes.createNode(this, config)

    // Setup client/connection
    try {
      this.client = new MazdaClient(config.email, this.credentials.password, config.region)
    } catch (err) {
      this.error(err.message, err.stack)
      return
    }

    Accounts.set(config.email, this)

    this.listVehicles = async () => {
      try {
        // Gets vehicles and stores in cache
        this.vehicles = await this.client.getVehicles()
      } catch (err) {
        this.error(err)
      }
    }

    // Get list of vehicles
    this.listVehicles()
  }

  RED.nodes.registerType('mazda-account', MazdaAccount, {
    credentials: {
      password: { type: 'password' }
    }
  })

  RED.httpAdmin.get('/mazda-client/vehicles', async function (req, res) {
    let { email, refetch } = req.query

    if (!email) {
      res.status(500).send('Missing arguments')
      return
    }

    if (!Accounts.has(email)) {
      res.status(500).send('Account not ready')
      return
    }

    let account = Accounts.get(email)

    // If refetch is true, vehicle list is fetched again; otherwise cache is used
    if (refetch) await account.listVehicles()

    res.set({ 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(account.vehicles))
    return
  })
}
