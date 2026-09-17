package com.seuprojeto.backend.dto;

import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.enums.ActivityType;
import com.seuprojeto.backend.enums.Priority;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public class ActivityResponse {

    private Long id;
    private Long userId;
    private String title;
    private String description;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private ActivityType type;
    private ActivityStatus status;
    private Priority priority;
    private boolean highlighted;
    private Long categoryId;
    private Instant createdAt;
    private Instant updatedAt;

    public static ActivityResponse fromEntity(Activity activity) {
        ActivityResponse response = new ActivityResponse();
        response.id = activity.getId();
        response.userId = activity.getUserId();
        response.title = activity.getTitle();
        response.description = activity.getDescription();
        response.date = activity.getDate();
        response.startTime = activity.getStartTime();
        response.endTime = activity.getEndTime();
        response.type = activity.getType();
        response.status = activity.getStatus();
        response.priority = activity.getPriority();
        response.highlighted = activity.isHighlighted();
        response.categoryId = activity.getCategoryId();
        response.createdAt = activity.getCreatedAt();
        response.updatedAt = activity.getUpdatedAt();
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

    public LocalDate getDate() {
        return date;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public ActivityType getType() {
        return type;
    }

    public ActivityStatus getStatus() {
        return status;
    }

    public Priority getPriority() {
        return priority;
    }

    public boolean isHighlighted() {
        return highlighted;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}