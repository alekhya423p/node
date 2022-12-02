ELD Provider Testing Information

For ELD providers whose devices have not yet been approved by FMCSA, this package contains two “test” certificates 
that can be used to submit requests against the ELD Submission Web Service.  

There are two possible certificate signature algorithms: RSA and ECDSA. This package contains both RSA and ECDSA 
test certificates, each provided in two formats: .pfx and crt. 

The .pfx file contains a complete private/public key pair. Providers will use this file when submitting test 
requests against the Web Service. This file is not protected by any access password. If you are prompted by a 
client to enter a password, leave this field blank. When submitting requests using these test certificates, use the 
following identification values:

-ELD Identifier: TESTXX
-ELD Registration ID: TEST

After testing with the above and a provider is ready to register and self-certify their device, they will need to 
provide their own valid certificate. The .crt files are included in this package as examples of this certificate,
they meet the minimum requirements for each type of public/private key algorithm defined in the ELD Interface 
Control Document and Web Services Development Handbook.  Providers can also test their submission process after 
self-certification with their own valid certificate. 

Notes:
-The test certificates will only function when the test flag is set to TRUE, if they are used with the test flag 
set to FALESE or not set, the submission will be rejected.

-The included certificate files are for testing or example purposes only. Any ELD registration submitted using the 
provided test certificates will be rejected.

-When using the test certificate, your response will always contain an informational message indicating that use of 
this certificate for non-test purposes will fail.

-If you supply your output file without updating the contents to match the provided ELD Identifier and ELD 
Registration ID, the test submission will be accepted, but a warning indicating each mismatch will be returned.

