package com.seuprojeto.backend.repository;

import com.seuprojeto.backend.entity.PendingItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PendingItemRepository extends JpaRepository<PendingItem, Long> {

    List<PendingItem> findByUserId(Long userId);
}

