package com.legacyai.controller;

import java.util.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.legacyai.analysis.AnalysisService;
import com.legacyai.dto.*;

@RestController
public class AnalysisController {
    private final AnalysisService service;

    public AnalysisController(AnalysisService s) {
        service = s;
    }

    @PostMapping("/api/projects/{id}/analyses")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public CreateAnalysisResponse create(
        @AuthenticationPrincipal UUID u,
        @PathVariable UUID id,
        @RequestBody CreateAnalysisRequest r) {
        return service.create(u, id, r);
    }

    @GetMapping("/api/projects/{id}/analyses")
    public List<AnalysisSummaryResponse> list(
        @AuthenticationPrincipal UUID u,
        @PathVariable UUID id) {
        return service.list(u, id);
    }

    @GetMapping("/api/analyses/{id}")
    public AnalysisDetailResponse detail(@AuthenticationPrincipal UUID u, @PathVariable UUID id) {
        return service.detail(u, id);
    }

    @DeleteMapping("/api/analyses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID u, @PathVariable UUID id) {
        service.delete(u, id);
    }

    @GetMapping("/api/ai/providers")
    public List<ProviderResponse> providers() {
        return service.providerList();
    }
}
