package com.seuprojeto.backend.dto;

import com.seuprojeto.backend.entity.PendingItem;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.enums.Priority;

import java.time.Instant;

public class PendingItemResponse {

    private Long id;
    private Long userId;
    private String title;
    private String description;
    private Priority priority;
    private ActivityStatus status;
    private Instant createdAt;
    private Instant updatedAt;

    public static PendingItemResponse fromEntity(PendingItem item) {
        PendingItemResponse response = new PendingItemResponse();
        response.id = item.getId();
        response.userId = item.getUserId();
        response.title = item.getTitle();
        response.description = item.getDescription();
        response.priority = item.getPriority();
        response.status = item.getStatus();
        response.createdAt = item.getCreatedAt();
        response.updatedAt = item.getUpdatedAt();
        return response;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Priority getPriority() {
        return priority;
    }

    public ActivityStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
