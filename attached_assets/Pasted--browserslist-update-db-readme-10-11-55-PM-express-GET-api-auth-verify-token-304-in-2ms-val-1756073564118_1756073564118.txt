/browserslist/update-db#readme
10:11:55 PM [express] GET /api/auth/verify-token 304 in 2ms :: {"valid":true}
10:11:56 PM [express] POST /api/wallet/log-connection 200 in 500ms :: {"success":true}
10:11:56 PM [express] POST /api/wallet/log-connection 200 in 510ms :: {"success":true}
10:11:56 PM [express] POST /api/wallet/log-connection 200 in 527ms :: {"success":true}
10:11:56 PM [express] GET /api/auth/user 200 in 739ms :: {"user":{"walletAddress":"0x479abda60f8c62a7…
10:11:56 PM [express] POST /api/wallet/log-connection 200 in 144ms :: {"success":true}
10:11:56 PM [express] GET /api/user/balances 200 in 147ms :: {"bccTransferable":0,"bccRestricted":0,"…
10:11:56 PM [express] POST /api/wallet/log-connection 200 in 141ms :: {"success":true}
10:11:56 PM [express] GET /api/user/activity 304 in 295ms :: {"activity":[]}
10:11:57 PM [express] GET /api/wallet/registration-status 304 in 445ms :: {"registered":true,"activat…
10:12:19 PM [express] GET /api/auth/user 200 in 729ms :: {"user":{"walletAddress":"0x479abda60f8c62a7…
Activation error: error: syntax error at or near "where"
    at file:///home/runner/workspace/node_modules/@neondatabase/serverless/index.mjs:1345:74
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async NeonPreparedQuery.execute (/home/runner/workspace/node_modules/src/neon-serverless/session.ts:102:18)
    at async DatabaseStorage.updateUser (/home/runner/workspace/server/storage.ts:429:20)
    at async <anonymous> (/home/runner/workspace/server/routes.ts:390:7) {
  length: 94,
  severity: 'ERROR',
  code: '42601',
  detail: undefined,
  hint: undefined,
  position: '21',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'scan.l',
  line: '1244',
  routine: 'scanner_yyerror'
}
10:12:20 PM [express] POST /api/membership/activate 500 in 300ms :: {"error":"Activation failed"}
^C