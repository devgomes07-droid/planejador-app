package com.seuprojeto.backend.controller;

import com.seuprojeto.backend.dto.*;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.entity.PendingItem;
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
    public ResponseEntity<List<PendingItemResponse>> list(@RequestParam Long userId) {
        List<PendingItemResponse> response = pendingItemService.findAllByUser(userId).stream()
                .map(PendingItemResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<PendingItemResponse> create(@Valid @RequestBody PendingItemRequest request) {
        PendingItem created = pendingItemService.create(request);
        return ResponseEntity.ok(PendingItemResponse.fromEntity(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PendingItemResponse> update(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody PendingItemRequest request
    ) {
        PendingItem updated = pendingItemService.update(id, userId, request);
        return ResponseEntity.ok(PendingItemResponse.fromEntity(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PendingItemResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody StatusUpdateRequest request
    ) {
        PendingItem updated = pendingItemService.updateStatus(id, userId, request.getStatus());
        return ResponseEntity.ok(PendingItemResponse.fromEntity(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @RequestParam Long userId) {
        pendingItemService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/convert")
    public ResponseEntity<ActivityResponse> convert(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody ConvertPendingItemRequest request
    ) {
        Activity created = pendingItemService.convertToActivity(id, userId, request);
        return ResponseEntity.ok(ActivityResponse.fromEntity(created));
    }
}
