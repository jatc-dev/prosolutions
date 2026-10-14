-- CreateTable
CREATE TABLE "CVAtsAnalysis" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "jobDescription" TEXT NOT NULL DEFAULT '',
    "analysis" TEXT NOT NULL DEFAULT '{}',
    "tailoring" TEXT NOT NULL DEFAULT '{}',
    "cvSnapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CVAtsAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CVAtsAnalysis_cvId_createdAt_idx" ON "CVAtsAnalysis"("cvId", "createdAt");

-- AddForeignKey
ALTER TABLE "CVAtsAnalysis" ADD CONSTRAINT "CVAtsAnalysis_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "CV"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
