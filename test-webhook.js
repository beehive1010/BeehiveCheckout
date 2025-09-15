#!/usr/bin/env node

// ThirdWeb Webhook 测试脚本
// 用于验证webhook端点和签名验证

import crypto from 'crypto';

// 配置
const WEBHOOK_URL = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/thirdweb-webhook';
const WEBHOOK_SECRET = '5aada87a79b4e45573607a1f46e0f3c8a04141d71044e3f6003c3a5a70e828f6';

// 生成签名
function generateSignature(payload, timestamp, secret) {
    const signatureString = `${timestamp}.${payload}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signatureString)
        .digest('hex');
    return signature;
}

// 测试数据
const testPayloads = [
    // ThirdWeb 官方支付 webhook 格式
    {
        name: 'ThirdWeb Payment Webhook',
        data: {
            version: 2,
            type: 'pay.onchain-transaction',
            data: {
                transactionId: 'test-tx-12345',
                paymentId: 'pay-67890',
                status: 'COMPLETED',
                fromAddress: '0x0000000000000000000000000000000000000000',
                toAddress: '0x1234567890123456789012345678901234567890',
                transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                chainId: 42161,
                contractAddress: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8',
                tokenId: '1',
                amount: '1',
                currency: 'ETH',
                timestamp: new Date().toISOString(),
                metadata: { test: true }
            }
        }
    },
    // Legacy 合约事件格式
    {
        name: 'Legacy Contract Event',
        data: {
            type: 'TransferSingle',
            transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            blockNumber: 123456789,
            contractAddress: '0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8',
            chainId: 42161,
            timestamp: new Date().toISOString(),
            data: {
                operator: '0x1234567890123456789012345678901234567890',
                from: '0x0000000000000000000000000000000000000000',
                to: '0x1234567890123456789012345678901234567890',
                id: '1',
                value: '1'
            }
        }
    },
    // 错误的合约地址 (应该被忽略)
    {
        name: 'Wrong Contract Address (Should be ignored)',
        data: {
            version: 2,
            type: 'pay.onchain-transaction',
            data: {
                transactionId: 'test-tx-wrong',
                paymentId: 'pay-wrong',
                status: 'COMPLETED',
                fromAddress: '0x0000000000000000000000000000000000000000',
                toAddress: '0x1234567890123456789012345678901234567890',
                transactionHash: '0xwrong1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
                chainId: 42161,
                contractAddress: '0x9999999999999999999999999999999999999999', // 错误地址
                tokenId: '1',
                amount: '1',
                currency: 'ETH',
                timestamp: new Date().toISOString()
            }
        }
    },
    // 测试基本连接 (无签名)
    {
        name: 'Basic Connection Test (No signature)',
        data: { test: 'connection' },
        skipSignature: true
    }
];

async function testWebhook(payload, skipSignature = false) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadString = JSON.stringify(payload.data);
    
    const headers = {
        'Content-Type': 'application/json',
        'x-timestamp': timestamp
    };

    if (!skipSignature) {
        const signature = generateSignature(payloadString, timestamp, WEBHOOK_SECRET);
        headers['x-payload-signature'] = signature;
    }

    console.log(`\n🧪 测试: ${payload.name}`);
    console.log(`📝 Payload: ${payloadString.substring(0, 100)}...`);
    console.log(`🔐 Signature: ${headers['x-payload-signature'] || 'None'}`);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers,
            body: payloadString
        });

        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { rawResponse: responseText };
        }

        console.log(`📊 Status: ${response.status}`);
        console.log(`📋 Response:`, JSON.stringify(responseData, null, 2));

        if (response.status === 200) {
            console.log(`✅ ${payload.name}: 成功`);
        } else {
            console.log(`⚠️ ${payload.name}: 非200状态码`);
        }
    } catch (error) {
        console.log(`❌ ${payload.name}: 失败`);
        console.error(`   错误:`, error.message);
    }
}

async function runTests() {
    console.log('🔗 开始测试 ThirdWeb Webhook...');
    console.log(`📍 Endpoint: ${WEBHOOK_URL}`);
    console.log(`🔑 Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);

    for (const payload of testPayloads) {
        await testWebhook(payload, payload.skipSignature);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }

    console.log('\n🎉 所有测试完成!');
    console.log('\n📋 预期结果:');
    console.log('1. ThirdWeb Payment Webhook: 应该被处理 (如果用户已注册)');
    console.log('2. Legacy Contract Event: 应该被处理 (如果是mint事件)');
    console.log('3. Wrong Contract Address: 应该被忽略');
    console.log('4. Basic Connection Test: 应该返回错误格式消息');
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export { generateSignature, testWebhook };