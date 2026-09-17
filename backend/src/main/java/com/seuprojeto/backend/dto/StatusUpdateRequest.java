package com.seuprojeto.backend.dto;

import com.seuprojeto.backend.enums.ActivityStatus;
import jakarta.validation.constraints.NotNull;

public class StatusUpdateRequest {

    @NotNull
    private ActivityStatus status;

    public ActivityStatus getStatus() {
        return status;
    }

    public void setStatus(ActivityStatus status) {
        this.status = status;
    }
}
