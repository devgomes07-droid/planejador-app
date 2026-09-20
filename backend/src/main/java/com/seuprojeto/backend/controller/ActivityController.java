package com.seuprojeto.backend.controller;

import com.seuprojeto.backend.dto.ActivityRequest;
import com.seuprojeto.backend.dto.ActivityResponse;
import com.seuprojeto.backend.dto.StatusUpdateRequest;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.security.CurrentUser;
import com.seuprojeto.backend.service.ActivityService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        Long userId = CurrentUser.getUserId();

        List<Activity> activities = (startDate != null && endDate != null)
                ? activityService.findByPeriod(userId, startDate, endDate)
                : activityService.findAllByUser(userId);

        List<ActivityResponse> response = activities.stream()
                .map(ActivityResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityResponse> getById(@PathVariable Long id) {
        Activity activity = activityService.findByIdAndUser(id, CurrentUser.getUserId());
        return ResponseEntity.ok(ActivityResponse.fromEntity(activity));
    }

    @PostMapping
    public ResponseEntity<ActivityResponse> create(@Valid @RequestBody ActivityRequest request) {
        request.setUserId(CurrentUser.getUserId());
        Activity created = activityService.create(request);
        return ResponseEntity.ok(ActivityResponse.fromEntity(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ActivityRequest request
    ) {
        Activity updated = activityService.update(id, CurrentUser.getUserId(), request);
        return ResponseEntity.ok(ActivityResponse.fromEntity(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ActivityResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        Activity updated = activityService.updateStatus(id, CurrentUser.getUserId(), request.getStatus());
        return ResponseEntity.ok(ActivityResponse.fromEntity(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        activityService.delete(id, CurrentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}