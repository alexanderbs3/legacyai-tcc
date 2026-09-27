package com.legacyai.ai; public interface AIProvider { AIAnalysisResponse analyze(AIAnalysisRequest request); String getProviderName(); boolean isAvailable(); }
