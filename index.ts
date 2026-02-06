#!/usr/bin/env node

import Safe from '@safe-global/protocol-kit'
import { ethers, Interface, JsonRpcProvider, Wallet } from 'ethers'
import fs from 'fs/promises'
import http from 'http'
;(async () => {
  const mode = process.argv[2]

  if (mode !== 'sign' && mode !== 'execute') {
    console.error(
      'Usage: npx @godzillaba/safe-signing-cli@1.0.0 <sign|execute> ...'
    )
    process.exit(1)
  }

  const [, , , ...args] = process.argv

  const [transactionsFile, safeAddress, rpcUrl, ...signatures] = args

  if (
    !transactionsFile ||
    !safeAddress ||
    !rpcUrl ||
    (mode === 'execute' && signatures.length === 0)
  ) {
    console.error(
      `Usage: npx @godzillaba/safe-signing-cli@1.0.0 ${mode} <transactionsFile> <safeAddress> <rpcUrl>${mode === 'execute' ? ' <signatureOne> <signatureTwo> ...' : ''}`
    )
    process.exit(1)
  }

  const transactions = await readAndValidateTxFile(transactionsFile)

  const chainId = await new JsonRpcProvider(rpcUrl)
    .getNetwork()
    .then(network => network.chainId)

  let protocolKit: Safe
  try {
    protocolKit = await Safe.init({
      provider: rpcUrl,
      safeAddress,
      contractNetworks: {
        [chainId.toString()]: {
          multiSendAddress: process.env.CUSTOM_MULTISEND_ADDRESS,
          multiSendCallOnlyAddress:
            process.env.CUSTOM_MULTISEND_CALLONLY_ADDRESS,
        },
      },
    })
  } catch (err: any) {
    if (err.message === 'Invalid multiSend contract address') {
      console.error(
        'Error: Unknown multiSend contract address for the current network. Please set CUSTOM_MULTISEND_ADDRESS'
      )
      console.error('Check the official Safe repo for the contract address')
      process.exit(1)
    }
    if (err.message === 'Invalid multiSendCallOnly contract address') {
      console.error(
        'Error: Unknown multiSendCallOnly contract address for the current network. Please set CUSTOM_MULTISEND_CALLONLY_ADDRESS'
      )
      console.error('Check the official Safe repo for the contract address')
      process.exit(1)
    }
    throw err
  }

  const safeTx = await protocolKit.createTransaction({
    transactions,
  })

  if (mode === 'sign') {
    sign()
  } else if (mode === 'execute') {
    execute()
  }

  async function sign() {
    const EIP712_PAYLOAD = {
      domain: {
        verifyingContract: safeAddress,
        chainId: '0x' + (await protocolKit.getChainId()).toString(16),
      },
      message: safeTx.data,
      primaryType: 'SafeTx',
      types: {
        EIP712Domain: [
          {
            name: 'chainId',
            type: 'uint256',
          },
          {
            name: 'verifyingContract',
            type: 'address',
          },
        ],
        SafeTx: [
          {
            type: 'address',
            name: 'to',
          },
          {
            type: 'uint256',
            name: 'value',
          },
          {
            type: 'bytes',
            name: 'data',
          },
          {
            type: 'uint8',
            name: 'operation',
          },
          {
            type: 'uint256',
            name: 'safeTxGas',
          },
          {
            type: 'uint256',
            name: 'baseGas',
          },
          {
            type: 'uint256',
            name: 'gasPrice',
          },
          {
            type: 'address',
            name: 'gasToken',
          },
          {
            type: 'address',
            name: 'refundReceiver',
          },
          {
            type: 'uint256',
            name: 'nonce',
          },
        ],
      },
    }

    const html = `
      <h1>Safe Signing Tool</h1>

      <script>
        const EIP712_PAYLOAD = ${JSON.stringify(EIP712_PAYLOAD)}

        window.addEventListener('load', async () => {
          if (typeof window.ethereum === 'undefined') {
            console.error('MetaMask is not installed.')
            return
          }
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: EIP712_PAYLOAD.domain.chainId,
              },
            ],
          })
          const account = (
            await window.ethereum.request({ method: 'eth_requestAccounts' })
          )[0]
          const signature = await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [account, JSON.stringify(EIP712_PAYLOAD)],
          })
          document.body.innerHTML +=
            '<p>Signature: <code>' + signature + '</code></p>'
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
  }

  async function execute() {
    if (!process.env.PRIVATE_KEY) {
      console.error('PRIVATE_KEY environment variable is not set.')
      process.exit(1)
    }

    const abi = [
      'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
    ]

    const tx = {
      to: safeAddress,
      data: new Interface(abi).encodeFunctionData('execTransaction', [
        safeTx.data.to,
        safeTx.data.value,
        safeTx.data.data,
        safeTx.data.operation,
        safeTx.data.safeTxGas,
        safeTx.data.baseGas,
        safeTx.data.gasPrice,
        safeTx.data.gasToken,
        safeTx.data.refundReceiver,
        ethers.concat(signatures),
      ]),
    }

    const signer = new Wallet(
      process.env.PRIVATE_KEY!,
      new JsonRpcProvider(rpcUrl)
    )
    const res = await signer.sendTransaction(tx)
    console.log('tx hash:', res.hash)
    await res.wait()
    console.log('Transaction executed successfully')
  }

  async function readAndValidateTxFile(filePath: string) {
    const obj = JSON.parse(await fs.readFile(filePath, 'utf-8'))
    if (
      !Array.isArray(obj) ||
      obj.some(
        tx =>
          !ethers.isAddress(tx.to) ||
          !(parseInt(tx.value) >= 0) ||
          !ethers.isHexString(tx.data) ||
          !(tx.operation === 0 || tx.operation === 1)
      )
    ) {
      throw new Error(
        'Transaction file is not valid. Need an array of { to, value, data, operation }'
      )
    }
    return obj
  }
})()
