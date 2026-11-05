package com.seuprojeto.backend.service;

import com.seuprojeto.backend.dto.ActivityRequest;
import com.seuprojeto.backend.dto.ConvertPendingItemRequest;
import com.seuprojeto.backend.dto.PendingItemRequest;
import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.entity.PendingItem;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.repository.PendingItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional(readOnly = true)
    public List<PendingItem> findAllByUser(Long userId) {
        return pendingItemRepository.findByUserId(userId);
    }

    /**
     * Busca a pendência garantindo que ela pertence ao usuário.
     * Pendência de outro usuário responde igual a "não existe" (404),
     * para não revelar que o id existe.
     */
    @Transactional(readOnly = true)
    public PendingItem findByIdAndUser(Long id, Long userId) {
        return pendingItemRepository.findById(id)
                .filter(item -> item.getUserId().equals(userId))
                .orElseThrow(() -> new NoSuchElementException("Pendência não encontrada"));
    }

    @Transactional
    public PendingItem create(PendingItemRequest request) {
        PendingItem item = new PendingItem(request.getUserId(), request.getTitle());
        item.setDescription(request.getDescription());
        item.setPriority(request.getPriority());
        return pendingItemRepository.save(item);
    }

    @Transactional
    public PendingItem update(Long id, Long userId, PendingItemRequest request) {
        PendingItem item = findByIdAndUser(id, userId);
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setPriority(request.getPriority());
        return pendingItemRepository.save(item);
    }

    @Transactional
    public PendingItem updateStatus(Long id, Long userId, ActivityStatus status) {
        PendingItem item = findByIdAndUser(id, userId);
        item.setStatus(status);
        return pendingItemRepository.save(item);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        PendingItem item = findByIdAndUser(id, userId);
        pendingItemRepository.delete(item);
    }

    @Transactional
    public Activity convertToActivity(Long id, Long userId, ConvertPendingItemRequest request) {
        PendingItem item = findByIdAndUser(id, userId);

        ActivityRequest activityRequest = new ActivityRequest();
        activityRequest.setTitle(item.getTitle());
        activityRequest.setDescription(item.getDescription());
        activityRequest.setDate(request.getDate());
        activityRequest.setStartTime(request.getStartTime());
        activityRequest.setEndTime(request.getEndTime());
        activityRequest.setType(request.getType());
        activityRequest.setPriority(item.getPriority());

        Activity createdActivity = activityService.create(userId, activityRequest);

        item.setStatus(ActivityStatus.COMPLETED);
        pendingItemRepository.save(item);

        return createdActivity;
    }
}