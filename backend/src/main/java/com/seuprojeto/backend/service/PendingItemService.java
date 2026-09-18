package com.seuprojeto.backend.service;

import com.seuprojeto.backend.dto.ConvertPendingItemRequest;
import com.seuprojeto.backend.dto.PendingItemRequest;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.entity.PendingItem;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.repository.PendingItemRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class PendingItemService {

    private final PendingItemRepository pendingItemRepository;
    private final ActivityService activityService;

    public PendingItemService(PendingItemRepository pendingItemRepository, ActivityService activityService) {
        this.pendingItemRepository = pendingItemRepository;
        this.activityService = activityService;
    }

    public List<PendingItem> findAllByUser(Long userId) {
        return pendingItemRepository.findByUserId(userId);
    }

    public PendingItem findByIdAndUser(Long id, Long userId) {
        PendingItem item = pendingItemRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Pendência não encontrada"));

        if (!item.getUserId().equals(userId)) {
            throw new SecurityException("Acesso negado a esta pendência");
        }

        return item;
    }

    public PendingItem create(PendingItemRequest request) {
        PendingItem item = new PendingItem(request.getUserId(), request.getTitle());
        item.setDescription(request.getDescription());
        item.setPriority(request.getPriority());
        return pendingItemRepository.save(item);
    }

    public PendingItem update(Long id, Long userId, PendingItemRequest request) {
        PendingItem item = findByIdAndUser(id, userId);
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setPriority(request.getPriority());
        return pendingItemRepository.save(item);
    }

    public PendingItem updateStatus(Long id, Long userId, ActivityStatus status) {
        PendingItem item = findByIdAndUser(id, userId);
        item.setStatus(status);
        return pendingItemRepository.save(item);
    }

    public void delete(Long id, Long userId) {
        PendingItem item = findByIdAndUser(id, userId);
        pendingItemRepository.delete(item);
    }

    public Activity convertToActivity(Long id, Long userId, ConvertPendingItemRequest request) {
        PendingItem item = findByIdAndUser(id, userId);

        com.seuprojeto.backend.dto.ActivityRequest activityRequest = new com.seuprojeto.backend.dto.ActivityRequest();
        activityRequest.setUserId(userId);
        activityRequest.setTitle(item.getTitle());
        activityRequest.setDescription(item.getDescription());
        activityRequest.setDate(request.getDate());
        activityRequest.setStartTime(request.getStartTime());
        activityRequest.setEndTime(request.getEndTime());
        activityRequest.setType(request.getType());
        activityRequest.setPriority(item.getPriority());

        Activity createdActivity = activityService.create(activityRequest);

        item.setStatus(ActivityStatus.COMPLETED);
        pendingItemRepository.save(item);

        return createdActivity;
    }
}
