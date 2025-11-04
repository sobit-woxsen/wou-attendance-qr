-- CreateIndex
CREATE INDEX "AttendanceSubmission_ipHash_submittedAtUTC_idx" ON "AttendanceSubmission"("ipHash", "submittedAtUTC");

-- CreateIndex
CREATE INDEX "AttendanceSubmission_roll_submittedAtUTC_idx" ON "AttendanceSubmission"("roll", "submittedAtUTC");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE INDEX "Passkey_version_idx" ON "Passkey"("version");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_status_endAtUTC_idx" ON "Session"("status", "endAtUTC");

-- CreateIndex
CREATE INDEX "Session_startIpHash_createdAtUTC_idx" ON "Session"("startIpHash", "createdAtUTC");
