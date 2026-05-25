using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TicketFlow.Api.Data;
using TicketFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------------------------------------
// 1. MVC controllers
// -----------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// -----------------------------------------------------------
// 2. Swagger (with a JWT "Authorize" button in the UI)
// -----------------------------------------------------------
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "TicketFlow API", Version = "v1" });

    // Tell Swagger we use JWT bearer tokens so the UI shows an Authorize button.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT returned by /api/auth/login here. No 'Bearer ' prefix needed."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// -----------------------------------------------------------
// 3. EF Core DbContext -> SQL Server (Windows Authentication)
// -----------------------------------------------------------
builder.Services.AddDbContext<TicketFlowDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// -----------------------------------------------------------
// 4. CORS policy for the Angular dev server on :4200
// -----------------------------------------------------------
const string AngularDevPolicy = "AngularDev";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularDevPolicy, policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// -----------------------------------------------------------
// 5. JWT bearer authentication
// -----------------------------------------------------------
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key missing in appsettings.json");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

// -----------------------------------------------------------
// 6. Our own services
// -----------------------------------------------------------
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddHostedService<PasswordSeeder>();  // one-shot seeder

// ===========================================================
// Build the app + configure the HTTP pipeline
// ===========================================================
var app = builder.Build();

// Swagger UI always on for MVP (handy during development).
app.UseSwagger();
app.UseSwaggerUI();

// HTTPS redirection is intentionally OFF in development:
// it would bounce localhost:5177 -> localhost:7115, and the browser
// distrusts the dev cert by default, which makes Swagger "Failed to fetch".
// Re-enable in production behind a real cert.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS must come before Auth.
app.UseCors(AngularDevPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
