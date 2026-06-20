Set-Location 'f:\hotellumen'
npx firebase-tools deploy 2>&1 | Out-File 'f:\hotellumen\deploy-log.txt' -Encoding utf8
