using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hunter.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddScanLines : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ScanLines",
                table: "Settings",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Settings",
                keyColumn: "Id",
                keyValue: 1,
                column: "ScanLines",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScanLines",
                table: "Settings");
        }
    }
}
