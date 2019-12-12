const express = require('express')
const bodyParser = require('body-parser')
const logger = require('morgan')
const config = require('./src/configs/configs')
const cors = require('cors')

const app = express()
const port = config.port
const routerNav = require('./src/index')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(logger('dev'))

app.use('/', routerNav)

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

app.use(cors())

app.get('*', (req, res) => {
  res.sendStatus(404)
})

module.exports = app
