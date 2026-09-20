package com.seuprojeto.backend.controller;

import com.seuprojeto.backend.dto.*;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.entity.PendingItem;
import com.seuprojeto.backend.security.CurrentUser;
import com.seuprojeto.backend.service.PendingItemService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pending-items")
public class PendingItemController {

    private final PendingItemService pendingItemService;

    public PendingItemController(PendingItemService pendingItemService) {
        this.pendingItemService = pendingItemService;
    }

    @GetMapping
    public ResponseEntity<List<PendingItemResponse>> list() {
        List<PendingItemResponse> response = pendingItemService.findAllByUser(CurrentUser.getUserId()).stream()
                .map(PendingItemResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<PendingItemResponse> create(@Valid @RequestBody PendingItemRequest request) {
        request.setUserId(CurrentUser.getUserId());
        PendingItem created = pendingItemService.create(request);
        return ResponseEntity.ok(PendingItemResponse.fromEntity(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PendingItemResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody PendingItemRequest request
    ) {
        PendingItem updated = pendingItemService.update(id, CurrentUser.getUserId(), request);
        return ResponseEntity.ok(PendingItemResponse.fromEntity(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PendingItemResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        PendingItem updated = pendingItemService.updateStatus(id, CurrentUser.getUserId(), request.getStatus());
        return ResponseEntity.ok(PendingItemResponse.fromEntity(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        pendingItemService.delete(id, CurrentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert")
    public ResponseEntity<ActivityResponse> convert(
            @PathVariable Long id,
            @Valid @RequestBody ConvertPendingItemRequest request
    ) {
        Activity created = pendingItemService.convertToActivity(id, CurrentUser.getUserId(), request);
        return ResponseEntity.ok(ActivityResponse.fromEntity(created));
    }
}