Set-Location 'f:\hotellumen'
$env:GOOGLE_APPLICATION_CREDENTIALS='f:\hotellumen\serviceAccountKey.json'
npx firebase-tools deploy 2>&1 | Out-File 'f:\hotellumen\deploy-log.txt' -Encoding utf8
