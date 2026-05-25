using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Data;

// The DbContext is the entry point to the database from C#.
// Every DbSet<T> below maps to a table.
public class TicketFlowDbContext : DbContext
{
    public TicketFlowDbContext(DbContextOptions<TicketFlowDbContext> options)
        : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<DepartmentHead> DepartmentHeads => Set<DepartmentHead>();
    public DbSet<RequestType> RequestTypes => Set<RequestType>();
    public DbSet<RequestTypeField> RequestTypeFields => Set<RequestTypeField>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketStatusHistory> TicketStatusHistory => Set<TicketStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // The DB table for status history is "TicketStatusHistory" (singular),
        // but EF's pluralization convention would look for "TicketStatusHistories".
        // Pin the table name explicitly.
        modelBuilder.Entity<TicketStatusHistory>().ToTable("TicketStatusHistory");

        // Ticket has TWO foreign keys pointing at Employees (RaisedBy and AssignedTo).
        // Tell EF which FK property goes with which navigation property,
        // so it doesn't create shadow columns.
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.RaisedByEmployee)
            .WithMany()
            .HasForeignKey(t => t.RaisedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.AssignedToEmployee)
            .WithMany()
            .HasForeignKey(t => t.AssignedToEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        // TicketStatusHistory also has a FK to Employees (ChangedBy).
        modelBuilder.Entity<TicketStatusHistory>()
            .HasOne(h => h.ChangedByEmployee)
            .WithMany()
            .HasForeignKey(h => h.ChangedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
