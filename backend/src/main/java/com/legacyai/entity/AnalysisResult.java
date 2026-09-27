package com.legacyai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "analysis_results")
public class AnalysisResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "analysis_id", nullable = false, unique = true)
    private UUID analysisId;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "technologies", columnDefinition = "TEXT")
    private String technologies;

    @Column(name = "architecture", columnDefinition = "TEXT")
    private String architecture;

    @Column(name = "problems", columnDefinition = "TEXT")
    private String problems;

    @Column(name = "security_risks", columnDefinition = "TEXT")
    private String securityRisks;

    @Column(name = "recommendations", columnDefinition = "TEXT")
    private String recommendations;

    @Column(name = "modernization", columnDefinition = "TEXT")
    private String modernization;

    protected AnalysisResult() {
    }

    public AnalysisResult(UUID id, String summary, String technologies, String architecture, String problems, String securityRisks, String recommendations, String modernization) {
        analysisId = id;
        this.summary = summary;
        this.technologies = technologies;
        this.architecture = architecture;
        this.problems = problems;
        this.securityRisks = securityRisks;
        this.recommendations = recommendations;
        this.modernization = modernization;
    }

    public String getSummary() { return summary; }
    public String getTechnologies() { return technologies; }
    public String getArchitecture() { return architecture; }
    public String getProblems() { return problems; }
    public String getSecurityRisks() { return securityRisks; }
    public String getRecommendations() { return recommendations; }
    public String getModernization() { return modernization; }
}
