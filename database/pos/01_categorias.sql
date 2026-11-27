-- Tabla de categorías del menú (Desayunos, Bebidas, ...). Idempotente.
IF OBJECT_ID('dbo.categorias', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.categorias (
    id     INT IDENTITY(1,1) CONSTRAINT PK_categorias PRIMARY KEY,
    nombre NVARCHAR(60) NOT NULL CONSTRAINT UQ_categorias_nombre UNIQUE,
    activo BIT NOT NULL CONSTRAINT DF_categorias_activo DEFAULT 1
  );
END
GO
