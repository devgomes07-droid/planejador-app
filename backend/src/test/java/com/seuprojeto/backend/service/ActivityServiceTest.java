package com.seuprojeto.backend.service;

import com.seuprojeto.backend.entity.Activity;
import com.seuprojeto.backend.enums.ActivityStatus;
import com.seuprojeto.backend.enums.ActivityType;
import com.seuprojeto.backend.exception.ScheduleConflictException;
import com.seuprojeto.backend.repository.ActivityRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final LocalDate DAY = LocalDate.of(2026, 11, 10);

    @Mock
    private ActivityRepository activityRepository;

    @InjectMocks
    private ActivityService activityService;

    private Activity activity(Long id, Long userId, String title, LocalTime start, LocalTime end) {
        Activity activity = new Activity(userId, title, ActivityType.COMMITMENT);
        ReflectionTestUtils.setField(activity, "id", id);
        activity.setDate(DAY);
        activity.setStartTime(start);
        activity.setEndTime(end);
        return activity;
    }

    @Test
    void findByIdAndUser_returnsActivity_whenUserIsOwner() {
        Activity mine = activity(10L, OWNER_ID, "Dentista", null, null);
        when(activityRepository.findById(10L)).thenReturn(Optional.of(mine));

        Activity result = activityService.findByIdAndUser(10L, OWNER_ID);

        assertEquals("Dentista", result.getTitle());
    }

    @Test
    void findByIdAndUser_throwsNotFound_whenActivityDoesNotExist() {
        when(activityRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class,
                () -> activityService.findByIdAndUser(99L, OWNER_ID));
    }

    @Test
    void findByIdAndUser_throwsNotFound_whenActivityBelongsToAnotherUser() {
        Activity notMine = activity(10L, OTHER_USER_ID, "Privado", null, null);
        when(activityRepository.findById(10L)).thenReturn(Optional.of(notMine));

        assertThrows(NoSuchElementException.class,
                () -> activityService.findByIdAndUser(10L, OWNER_ID));
    }

    @Test
    void delete_doesNotDeleteActivityFromAnotherUser() {
        Activity notMine = activity(10L, OTHER_USER_ID, "Privado", null, null);
        when(activityRepository.findById(10L)).thenReturn(Optional.of(notMine));

        assertThrows(NoSuchElementException.class,
                () -> activityService.delete(10L, OWNER_ID));

        verify(activityRepository, never()).delete(any());
    }

    @Test
    void updateStatus_savesNewStatus_whenUserIsOwner() {
        Activity mine = activity(10L, OWNER_ID, "Estudar", null, null);
        when(activityRepository.findById(10L)).thenReturn(Optional.of(mine));
        when(activityRepository.save(any(Activity.class))).thenAnswer(inv -> inv.getArgument(0));

        Activity result = activityService.updateStatus(10L, OWNER_ID, ActivityStatus.COMPLETED);

        assertEquals(ActivityStatus.COMPLETED, result.getStatus());
    }

    @Test
    void updateStatus_throwsConflict_whenReopeningCancelledActivityOverlapsAnother() {
        Activity cancelled = activity(10L, OWNER_ID, "Reunião", LocalTime.of(10, 0), LocalTime.of(11, 0));
        cancelled.setStatus(ActivityStatus.CANCELLED);
        Activity existing = activity(20L, OWNER_ID, "Aula", LocalTime.of(10, 30), LocalTime.of(12, 0));

        when(activityRepository.findById(10L)).thenReturn(Optional.of(cancelled));
        when(activityRepository.findByUserIdAndDateAndStartTimeIsNotNullAndStatusNot(
                OWNER_ID, DAY, ActivityStatus.CANCELLED)).thenReturn(List.of(existing));

        assertThrows(ScheduleConflictException.class,
                () -> activityService.updateStatus(10L, OWNER_ID, ActivityStatus.PENDING));

        verify(activityRepository, never()).save(any());
    }
}
