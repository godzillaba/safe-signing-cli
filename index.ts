#!/usr/bin/env node

import { ethers } from 'ethers'
import http from 'http'
;(async () => {
  const [, , ...args] = process.argv

  const [chainId, to, value, data] = args

  if (
    !(chainId && to && value && data) ||
    !(parseInt(chainId) >= 0) ||
    !ethers.isAddress(to) ||
    !(BigInt(value) >= 0n) ||
    !ethers.isHexString(data)
  ) {
    console.error(
      `Usage: npx @godzillaba/signing-cli@1.0.0 <chainId> <to> <value> <data>`
    )
    process.exit(1)
  }

  const TX_REQ = {
    to,
    value,
    data,
  }

  const html = `
      <h1>Tx Signing Tool</h1>

      <script>
        const chainId = ${chainId}
        const TX_REQ = ${JSON.stringify(TX_REQ)}

        window.addEventListener('load', async () => {
          if (typeof window.ethereum === 'undefined') {
            console.error('MetaMask is not installed.')
            return
          }
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: chainId,
              },
            ],
          })
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
          const account = accounts[0]
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: account,
              to: TX_REQ.to,
              value: '0x' + BigInt(TX_REQ.value).toString(16),
              data: TX_REQ.data,
            }],
          })
          document.body.innerHTML += '<p>Transaction sent: ' + txHash + '</p>'
        })
      </script>
    `

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
    server.close()
  })
  server.listen(8080, () => {
    console.log(
      'Open http://localhost:8080 in your browser to sign the transaction.'
    )
  })
})()
