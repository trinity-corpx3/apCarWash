package com.trinity.poserp.repository;

import com.trinity.poserp.entity.ExpenseAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseAttachmentRepository extends JpaRepository<ExpenseAttachment, Long> {

    @Query("SELECT a FROM ExpenseAttachment a WHERE a.expense.id = :expenseId")
    List<ExpenseAttachment> findByExpenseId(@Param("expenseId") Long expenseId);
}
